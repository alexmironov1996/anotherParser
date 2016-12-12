//
//import cheerio from 'cheerio'
var cheerio = require('cheerio');
var request = require('request');
var Excel = require('exceljs');
// import request from 'request'

var mainLink='http://damvent.com/en/references';
var workbook = new Excel.Workbook();
workbook.creator = 'Me';
workbook.lastModifiedBy = 'Her';
workbook.created = new Date(1985, 8, 30);
workbook.modified = new Date();
workbook.lastPrinted = new Date(2016, 9, 27);

workbook.views = [
  {
    x: 0, y: 0, width: 10000, height: 20000, 
    firstSheet: 0, activeTab: 1, visibility: 'visible'
  }
]
var worksheet = workbook.addWorksheet('My Sheet');
worksheet.columns = [
    { header: 'title', key: 'title', width: 50 },
	{ header: 'country', key: 'country', width: 15 },
    { header: 'city', key: 'city', width: 20 },
	{ header: 'type', key: 'type', width: 25},
	{ header: 'sub_info', key: 'sub_info', width: 25},
	{ header: 'cars_count', key: 'cars_count', width: 10},
	{ header: 'year', key: 'year', width: 10}
];

worksheet.addRow({id: 2, name: 'Jane Doe', dob: new Date(1965,1,7)});



 
var sublinks=['','?page=2','?page=3','?page=4','?page=5','?page=6','?page=7','?page=8','?page=9','?page=10','?page=11']
var bdDataArray=[];	

var resultPromise=getResult().then(
	result=>{
		workbook.xlsx.writeFile("1.xlsx")
	    .then(function() {
	        // done 
	    });
	}
);

function getResult(){
	promiseArray=[];
	htmlResult =[];
	for(var i=0; i<sublinks.length; i++){
		
		var promise=new Promise((resolve,reject)=>{
			request(mainLink+sublinks[i], function (error, response, data) {		
				if (!error && response.statusCode == 200) {
					resolve(data);
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
		
		promiseArray.push(promise);
	}
	return Promise.all(promiseArray).then(
			result=>{
				
				var res= parseData(htmlResult);
				return(res);
			},
			
			error=>console.log("can't download info")
		);
}
function parseData(htmlDataArray){
	var array=[]
	for(var i=0; i<htmlDataArray.length; i++){
		
		var data=cheerio.load(htmlDataArray[i], {
	  	  ignoreWhitespace: true,
	  	  xmlMode: true
	    });
		
		data('div.ref-content-results').find('li.item').each(function(i,elem){
			array.push(data(this));
			
		});	
	}
	var title='';
	var country='';
	var city='';
	var type='';
	var sub_info='';
	var cars_count='';
	var year='';
	console.log(array.length);
	for(var i=0; i<array.length; i++){
		try{
			title=array[i].find('div')['0']['children'][0]['children'][0]['data'];
			country=array[i].find('div')['1']['children'][2]['data'].replace(/\s/g, '');
			city=array[i].find('div')['2']['children'][0]['data'];
			type=array[i].find('div')['3']['children'][0]['data'];
			sub_info=array[i].find('div')['4']['children'][0]['data'];
			cars_count=array[i].find('div')['5']['children'][0]['data'].replace('machines','');
			year=array[i].find('div')['6']['children'][0]['data'];

		}
		catch (e){
			//console.log(addressArray);
		}
		worksheet.addRow({
			title:title,
			country:country,
			city:city,
			type:type,
			sub_info:sub_info,
			cars_count:cars_count,
			year:year});
	}
}



