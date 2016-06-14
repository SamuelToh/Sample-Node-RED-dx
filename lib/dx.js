  /*******************************************************************************
   * Copyright (c) 2016 IBM Corp.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *******************************************************************************/

   var log4js = require("log4js")
      ,logger = log4js.getLogger("dx")
      ,request = require('request');


  module.exports = function (config){

    var username = config.username;
    var password = config.password;
    var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

    var baseURL = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/';

    var connectionArgs = {"headers" :  {
      "Authorization": auth,
      "Accept": "application/json"
    }}

    function _createProject (context) {
      var promise = new Promise(function(success,error) {
        var url = baseURL + 'wcmrest/Project';

        request.post({
          url: url,
          headers: connectionArgs.headers,
          json: {
            entry: {
              name: context.name,
              title: context.title,
              description:  context.description
            }
          }
        }, function(errorMsg, response, body) {
          if (errorMsg) {
            error(errorMsg);
          } else if (body) {
            logger.debug(body);
            success(body);
          }
        });
      });
      return promise;

    }

  function _approveProject(context) {
    var promise = new Promise(function(success,error) {
      var url = baseURL + 'wcmrest/Project/' + context.id + '/approve';

      request.post({
        url: url,
        headers: connectionArgs.headers
      }, function(errorMsg, response, body) {
        if (errorMsg) {
          error(errorMsg);
        } else if (body) {
          success(body);
        }
      });
    });
    return promise;
  }


    function _rejectProject(context) {
      var promise = new Promise(function(success,error) {
        var url = baseURL + 'wcmrest/Project/' + context.id + '/reject';

        request.post({
          url: url,
          headers: connectionArgs.headers
        }, function(errorMsg, response, body) {
          if (errorMsg) {
            error(errorMsg);
          } else if (body) {
            success(body);
          }
        });
      });
      return promise;

    }

    function _submitProject(context) {
      var promise = new Promise(function(success,error) {
        var url = baseURL + 'wcmrest/Project/' + context.id + '/submit';

        request.post({
          url: url,
          headers: connectionArgs.headers
        }, function(errorMsg, response, body) {
          if (errorMsg) {
            error(errorMsg);
          } else if (body) {
            success(body);
          }
        });
      });
      return promise;

    }


    return {
      "createProject":  _createProject,
      "submitProject":  _submitProject,
      "approveProject":  _approveProject,
      "rejectProject":  _rejectProject
    };
  }
