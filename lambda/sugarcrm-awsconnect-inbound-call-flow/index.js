const https = require("https");
//const querystring = require('querystring');

exports.handler = async (event, context) => {
  const DateNow = new Date();
  console.log(event);
  //step 1: get access token
  const getAccessToken = function() {
    return new Promise((resolve,reject) => {
      const postData = {
        "grant_type": "password",
        "client_id": "sugar",
        "client_secret": "",
        "username": process.env.sugarcrm_username,
        "password": process.env.sugarcrm_password,
        "platform": "base"
      };
      const options = {
        hostname: "ideacrew.sugarondemand.com",
        path: "/rest/v11_3/oauth2/token",
        method: "POST",
        headers: {
          "cache-control": "no-cache",
          //'Content-Type': 'application/x-www-form-urlencoded',
          //'Content-Length': postData.length
        }
      };
      const req = https.request(options, (res) => {
        var data = '';
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);
        res.on('data', (chunk) => {
          data += chunk;
        })
        res.on('end', () => {
          var outputData = JSON.parse(data);
          //console.log('output', JSON.parse(data));
          resolve(outputData.access_token);

        });
      });
      req.on('error', (e) => {
        console.error(e);
      });
      req.write(JSON.stringify(postData));
      req.end();
    });
  };

  //step 2: search contacats
  const promiseContactSearch = function(access_token){
    return new Promise((resolve, reject) => {
      //get the incoming phone number
      var incomingPhone = event.Details.Parameters['system-customer-number'];
      var searchPhone = '%' + incomingPhone.substring(2,5) + '%' + incomingPhone.substring(5,8) + '%' + incomingPhone.substring(8,12) + '%';
      //console.log('incomingPhone:',incomingPhone, searchPhone);
      //console.log('access_token:',access_token);
      //setup api call
      const postData = {
        "filter":[
          {
            "$or":[
              {
                "phone_mobile":{
                  "$starts":searchPhone
                },
                "phone_home":{
                  "$starts":searchPhone
                },
                "phone_work":{
                  "$starts":searchPhone
                }
              }
            ]
          }
       ],
       "max_num":1,
       "offset":0,
       "fields":"id,name",
       "order_by":"date_entered",
       "favorites":false,
       "my_items":false
      };
      //console.log(postData);
      const options = {
        hostname: "ideacrew.sugarondemand.com",
        path: "/rest/v11_3/Contacts/filter",
        method: "POST",
        headers: {
          "oauth-token": access_token,
          "cache-control": "no-cache",
        }
      };
      const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        var data = '';
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);
        res.on('data', (chunk) => {
          data += chunk;
        })
        res.on('end', () => {
          var outputData = JSON.parse(data);
          //console.log(outputData);
          if (outputData.records.length == 1){
            //we found a record!
            resolve(outputData.records[0]);
          }else{
            //no record found!
            resolve({
              id: 'NOTFOUND',
              name: 'NOTFOUND',
            });
            //TODO: Create contact??
          }

        });
      });
      req.on('error', (e) => {
        console.error(e);
      });
      req.write(JSON.stringify(postData));
      req.end();
    });
  };

  //Step 3: generate URL of call recording
  //Sample URL: https://s3.amazonaws.com/connect-2743f73185c6/connect/dc-pfl/CallRecordings/2019/01/28/a65c10fe-d2bb-497c-bf5c-152e775681ca_20190128T18%3A34_UTC.wav
  const generateCallRecordingUrl = function(){
    return new Promise((resolve, reject) => {
      //var recordingUrl = 'https://s3.amazonaws.com/connect-2743f73185c6/connect/dc-pfl/CallRecordings/';
      var recordingUrl = 'https://d1v27bpqd94ue9.cloudfront.net/connect/dc-pfl/CallRecordings/'
      recordingUrl = recordingUrl + DateNow.getFullYear() + '/'
      if (parseInt(DateNow.getMonth()+1) < 10){
      recordingUrl = recordingUrl + '0' + parseInt(DateNow.getMonth()+1) + '/'
      }else{
      recordingUrl = recordingUrl + parseInt(DateNow.getMonth()+1) + '/'
      }
      if (parseInt(DateNow.getDate()+1) < 10){
      recordingUrl = recordingUrl + '0' + DateNow.getDate() + '/'
      }else{
      recordingUrl = recordingUrl + DateNow.getDate() + '/'
      }
      recordingUrl = recordingUrl + event.Details.ContactData.ContactId + '_'
      recordingUrl = recordingUrl + DateNow.getFullYear()
      if (parseInt(DateNow.getMonth()+1) < 10){
      recordingUrl = recordingUrl + '0' + parseInt(DateNow.getMonth()+1)
      }else{
      recordingUrl = recordingUrl + parseInt(DateNow.getMonth()+1)
      }
      if (DateNow.getDate() < 10){
      recordingUrl = recordingUrl + '0' + DateNow.getDate()
      }else{
      recordingUrl = recordingUrl + DateNow.getDate()
      }
      recordingUrl = recordingUrl + 'T'
      if (parseInt(DateNow.getHours()) < 10){
      recordingUrl = recordingUrl + '0' + parseInt(DateNow.getHours())
      }else{
      recordingUrl = recordingUrl + parseInt(DateNow.getHours())
      }
      recordingUrl = recordingUrl + encodeURIComponent(':')
      if (parseInt(DateNow.getMinutes()+1) < 10){
      recordingUrl = recordingUrl + '0' + parseInt(DateNow.getMinutes()+1)
      }else{
      recordingUrl = recordingUrl + parseInt(DateNow.getMinutes()+1)
      }
      recordingUrl = recordingUrl + '_UTC.wav'
      resolve({
        recordingUrl: recordingUrl
      });
    });
  };

  //Step 4: Update user will this call information
  const promiseAddCallToContact = function(assess_token,contact,recordingUrl){
    return new Promise((resolve, reject) => {
      //setup api call

      const postData = {
        name: 'Connect Call',
        description: '',
        recordingurl_c: recordingUrl,
        direction: 'Inbound',
        date_start: DateNow.toISOString(),
        duration_minutes:'1',
        status:'Held',
      };
      //console.log(postData);
      const options = {
        hostname: "ideacrew.sugarondemand.com",
        path: "/rest/v11_3/Contacts/"+contact.id+"/link/calls",
        method: "POST",
        headers: {
          "oauth-token": access_token,
          "cache-control": "no-cache",
        }
      };
      const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        var data = '';
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
        res.on('data', (chunk) => {
          data += chunk;
        })
        res.on('end', () => {
          var outputData = JSON.parse(data);
          console.log(outputData);
          resolve(outputData.related_record);
        });
      });
      req.on('error', (e) => {
        console.error(e);
      });
      req.write(JSON.stringify(postData));
      req.end();
    });
  };

  // Step 5: Execute
  const access_token  =  await getAccessToken()
  const contact       =  await promiseContactSearch(access_token);
  const callRecording =  await generateCallRecordingUrl();
  const call          =  await promiseAddCallToContact(access_token,contact, callRecording.recordingUrl)
  const baseUrl       =  'https://ideacrew.sugarondemand.com/';

  return {
    contactLink: baseUrl + '#Contacts/' + contact.id,
    contactName: contact.name,
    callLink: baseUrl + '#Calls/' + call.id
  }
};

