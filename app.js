//
//import cheerio from 'cheerio'
var cheerio = require('cheerio');
var request = require('request');
// import request from 'request'

var mainLink='http://vladimir.1000bankov.ru';
var detailLink;
var bdDataArray=[];	

var resultPromise=getResult();

function getResult(){
	new Promise((resolve, reject) => {

			request(mainLink+'/kurs/', function (error, response, html) {
			  if (!error && response.statusCode == 200) {
				  resolve(html);
			  }
			  else{
				  reject(null);
			  }
		  });

		}).then(
				result=>{
					var bankDataPromise=parseMainPage(result);
					return bankDataPromise;
				},
				error=>console.log("can't download base info")
			);	
}


	

function parseMainPage(html){
	var promiseArray=[];
	var bdData=[];
    var data = cheerio.load(html, {
  	  ignoreWhitespace: true,
  	  xmlMode: true
    });
	
    data('#bnkurs').each(function(i, element){
		var self = this;
		detailLink=mainLink+data(self).find('td.mobi_bnkurs').find('a').attr('href');
		
		if(data(self).find('div.div_td.thitytwo').toArray!=undefined 
			&& data(self).find('td.mobi_bnkurs').find('a').find('img').attr('src')!=undefined){
				var detailPagePromise=new Promise((resolve, reject) => {
					request(detailLink, function (error, response, detailHtml) {
						if (!error && response.statusCode == 200) {
							resolve(detailHtml);
					
						}
						else{
							reject(null);
						}
					});
				}).then(
						result=>{var resPromise=parseDetailPage(result,data(self).find('div.div_td.thitytwo').toArray(),
									data(self).find('td.mobi_bnkurs').find('a').find('img').attr('src'));
									//resPromise.then(data=>console.log(data));
								 return resPromise;
							},						
						error=>console.log("can't download detail info")
					);			
				promiseArray.push(detailPagePromise);	
				
			}
		
 	});
	//console.log(promiseArray.length);
    return Promise.all(promiseArray).then(
		result=>{
			return result;
		},
			
		error=>console.log(error.message)
	); 
	
}
function parseDetailPage(detailHtml,money,imgSrc){
	var detailData=cheerio.load(detailHtml, {
  	  ignoreWhitespace: true,
  	  xmlMode: true
    });
	var name=detailData("div.about-text.pwki").find("p").find("b").toArray();
	var sublinks=[];
	if (detailData("div.addresses-block-o").find("a").attr("href")!=undefined){
		sublinks.push(detailData("div.addresses-block-o").find("a").attr("href"));
	}
	if (detailData("div.addresses-block-b").find("a").attr("href")!=undefined){
		sublinks.push(detailData("div.addresses-block-b").find("a").attr("href"));
	}
	if (Object.keys(sublinks).length>0){
		var geoPromiseArray=[];
		var htmlResult=[];
		
		for(var i=0; i<sublinks.length; i++){
			
			var geoPromise=new Promise((resolve,reject)=>{
				request(mainLink+sublinks[i], function (error, response, subBanksHtml) {		
					if (!error && response.statusCode == 200) {
						resolve(subBanksHtml);
					}
					else{
						reject(null);
					}
				});	
			}).then(
					result=>{
						htmlResult.push(result);
					},
					reject=>console.log("cant download page")
				);
			
			geoPromiseArray.push(geoPromise);
		}
		return Promise.all(geoPromiseArray).then(
				result=>{
					
					var res= parseSubBanks(htmlResult,money,imgSrc,name[0]["children"][0]["data"],
					detailData("[itemprop='telephone']").text(),
					detailData("td.cont-td").find("a").find("b").text()
					);

					return(res);
				},
				
				error=>console.log("can't download geo info")
			);
	}
	else return null;
}
function parseSubBanks(htmlData,money,imgSrc,fullName,phone,webSite){
	var subBanks=[];
	
	for(var i=0; i<htmlData.length; i++){
		
		var geoData=cheerio.load(htmlData[i], {
	  	  ignoreWhitespace: true,
	  	  xmlMode: true
	    });
		if (geoData("td.adr-bankomats-map").find("h2").text()=="Адреса банкоматов"){
			var bankomatAddresses=geoData("td.adr-bankomats-map").find("ul").find("[id='metka']").toArray();
			
			var placeMarkArray=getPlaceMarks(geoData("div.div-maps-adr").find("script").text());
			
			if(bankomatAddresses.length==placeMarkArray.length){
				subBanks=subBanks.concat(createSubBankObjects(bankomatAddresses,placeMarkArray,0));
			}
		}
		else{
			var officeAddresses=geoData("td.left_map_block").find("[id='item_adr']").toArray();
			var placeMarkArray=getPlaceMarks(geoData("td.td_kart").find("script").text());
			if(officeAddresses.length==placeMarkArray.length){
				subBanks=subBanks.concat(createSubBankObjects(officeAddresses,placeMarkArray,1));
			}
		}
	}
	return createBankObject(imgSrc,fullName,phone,webSite,subBanks,money);
	
}

function getPlaceMarks(inputText){
	var reg=/[0-9]*\.?[0-9]+\,[0-9]*\.?[0-9]+/g;	
	return inputText.match(reg).slice(1);
}
function createBankObject(imgSrc,fullName,phone,webSite,subBanks,money){
	var bankObj={};
	bankObj["name"]=fullName;
	bankObj["phone"]=phone;
	bankObj["webSite"]=webSite;
 	bankObj["imgSrc"]=imgSrc;
 	bankObj["money"]=checkTopPrice(money);
	
 	bankObj["subBanks"]=subBanks;
	return bankObj;
	
}
function createSubBankObjects(addressArray,places,type){
	var subBankArray=[];
	for(var i=0; i<addressArray.length; i++){
		var subBankObj={};
		subBankObj["type"]=type;
		try{
			if (type==0){
				var address=addressArray[i]['children'][0]['data'].replace(";",'');
				address=address.replace(/\s/g, '');
				subBankObj["address"]=address;
			
				var worktime=addressArray[i]['children'][1]['children'][0]['data'].replace(";",'');
				worktime.replace(/\s/g, '');
				subBankObj["worktime"]=worktime;
			
			}
			else if(type==1){
				var address=addressArray[i]['children'][1]['children'][0]['children'][0]['data'].replace(";",'');
				address=address.replace(/\s/g, '');
				subBankObj["address"]=address;
			
				var worktime=addressArray[0]['children'][1]['children'][1]['children'][1]['children'][0]['children'][0]['data'];
				worktime=worktime.replace(";",'');
				worktime.replace(/\s/g, '');
				subBankObj["worktime"]=worktime;
			}
		
			var latLon=places[i].split(",").map(function(item) {
	    		return parseFloat(item, 10);
				});	
			subBankObj["loc"]=latLon;
			console.log(subBankObj);
			subBankArray.push(subBankObj);
		}
		catch (e){
			console.log(addressArray);
		}
		
	}
	return subBankArray;
}
function checkTopPrice(moneyObj){
	var money=[];
	for(var i=0; i<moneyObj.length; i++){
		if("data" in moneyObj[i]['children'][0]){
			money.push(parseFloat(moneyObj[i]['children'][0]['data'],10));
		}
		else{
			money.push(parseFloat(moneyObj[i]['children'][0]['children'][0]['data'],10))
		}
	}
	return money;
}


//супер регулярное выражение хихик [0-9]*\.?[0-9]+\,[0-9]*\.?[0-9]+
//







