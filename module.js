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
'use strict';

var log4js = require('log4js')
  ,dx = require('./lib/dx')
  ,logger = log4js.getLogger('node-red-contrib-digital-experience');

module.exports = function(RED) {
/*
query url
http://wpsvm226.boeblingen.de.ibm.com:10039/wps/mycontenthandler/!ut/p/digest!dQCyq7c6oSk-gWL5bdSvvw/wcmrest/query?mime-type=application/json&name=my%20item%20name
*/
  function DXServerNode(config) {
    var METHOD = "DXServerNode";
    logger.debug(METHOD , config);

    RED.nodes.createNode(this, config);

    var username = config.username;
    var password = config.password;
    var auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

    var request = require('request');

    var server = dx(config);

    this.getConfig = function() {
      return config;
    }

/*
this.updateContentElement = function(contentItemUUID, data, callback) {
  server.update(contentItemUUID,data,callback);
}
*/
    this.updateContentElement = function(contentItemUUID, data, callback) {
      var METHOD = "DXServerNode.updateContentElement";
      logger.debug(METHOD);

      if (data != null && data.length > 0) {
        for (var i = 0; i < data.length; i++) {
          var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/wcmrest/Content/' + contentItemUUID + '/elements/' + data[i].name;
          logger.debug(METHOD + url);
          request.put({
            url: url,
            headers: {
              "Authorization": auth,
              "Content-type": data[i].contenttype,
              "Accept": "application/json"
            },
            body: data[i].data
          }, callback);
        }
      }
    }

    this.updatePortletConfig = function(pageid, controlid, parameters, callback) {
      console.log("updatePortletConfig");

      var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/?uri=pm:oid:' + controlid + '@oid:' + pageid;

      request.get({
        url: url,
        headers: {
          "Authorization": auth
        }
      }, function(error, response, body) {
        // console.log(body);
        var xpath = require('xpath'),
          dom = require('xmldom').DOMParser
        var doc = new dom().parseFromString(body)
        var select = xpath.useNamespaces({
          "atom": "http://www.w3.org/2005/Atom"
        });
        var nodes = select("//atom:link[@rel='related']/@href", doc);
        logger.debug(nodes);

        if (nodes != null && nodes.length == 1) {
          var entityURL = 'http://' + config.host + ':' + config.port + nodes[0].nodeValue;

          request.get({
            url: entityURL,
            headers: {
              "Authorization": auth,
              "Accept": "application/json"
            }
          }, function(error, response, body) {
            console.log(body);
            var xpath = require('xpath'),
              dom = require('xmldom').DOMParser
            var doc = new dom().parseFromString(body)
            var select = xpath.useNamespaces({
              "atom": "http://www.w3.org/2005/Atom",
              "model": "http://www.ibm.com/xmlns/prod/websphere/portal/v6.0.1/portal-model-elements",
              "base": "http://www.ibm.com/xmlns/prod/websphere/portal/v6.0/ibm-portal-composite-base"
            });

            if (parameters != null && parameters.length > 0) {
              for (var n = 0; n < parameters.length; n++) {
                var nodes = select("//model:portletpreferences[@name='" + parameters[n].name + "']/base:value", doc);
                if (nodes != null && nodes.length == 1) {
                  // console.log(nodes[0]);
                  nodes[0].setAttributeNS("http://www.ibm.com/xmlns/prod/websphere/portal/v6.0/ibm-portal-composite-base", "value", parameters[n].value);
                } else {
                  // create a new node
                }
              }
            }

            var XMLSerializer = require('xmldom').XMLSerializer;

            request.put({
              url: entityURL,
              headers: {
                "Authorization": auth,
                "Content-Type": "application/xml"
              },
              body: new XMLSerializer().serializeToString(doc)
            }, function(error, response, body) {
              callback(response);
            });

          });
        }

      });
    }

    this.queryContent = function(query, callback) {
      console.log("queryContent");

      var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/wcmrest/query';

      request.get({
        url: url,
        headers: {
          "Authorization": auth,
          "Accept": "application/json"
        },
        qs: query
      }, function(error, response, body) {
        var result = JSON.parse(body);
        if (result.feed.entry && result.feed.entry.length > 0) {
          callback(result.feed.entry);
        } else {
          callback(undefined);
        }
      });
    }



    this.locateContentItem = function(creationContext, callback) {
      console.log("locateContentItem");

      var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/wcmrest/query';

      var query = {};

      if (creationContext.name) {
        query.name = creationContext.name;
      }

      if (creationContext.parent) {
        query.parent = creationContext.parent;
      }

      request.get({
        url: url,
        headers: {
          "Authorization": auth,
          "Accept": "application/json"
        },
        qs: query
      }, function(error, response, body) {
        var result = JSON.parse(body);
        if (result.feed.entry && result.feed.entry.length > 0) {
          callback(result.feed.entry[0]);
        } else {
          callback(undefined);
        }
      });

    }

    this.updateContentItem = function(item,updateContext, callback) {
      console.log("updateContentItem");

      var url = 'http://' + config.host + ':' + config.port;

      if (item.link && item.link.length > 0) {
        for (var i = 0; i < item.link.length; i++) {
          if (item.link[i].rel == 'edit') {
            url += item.link[i].href;
            break;
          }
        }
      }

      logger.debug(url);

      var keywords = updateContext.keywords || [];

      request.put({
        url: url,
        headers: {
          "Authorization": auth,
          "Accept": "application/json"
        },
        json: {
          entry: {
            name: updateContext.name,
            profile: {
              keyword: keywords
            }
          }
        }
      }, callback);
    }

    this.createContentItem = function(creationContext, callback) {
      console.log("createContentItem");

      var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/wcmrest/Content';

      var keywords = creationContext.keywords || [];

      logger.debug('DXServerNode' + url);
      request.post({
        url: url,
        headers: {
          "Authorization": auth,
          "Accept": "application/json",
        },
        json: {
          entry: {
            name: creationContext.name,
            link: [{
              rel: 'parent',
              href: config.context + '/mycontenthandler/wcmrest/item/' + creationContext.parent
            }, {
              rel: 'content-template',
              href: config.context + '/mycontenthandler/wcmrest/item/' + creationContext.template
            }],
            profile: {
              keyword: keywords
            }
          }
        }
      }, callback);
    }

    this.createProject = function(creationContext) {
      logger.debug("createProject");
      return server.createProject(creationContext);
    };

    this.findContentItem = function(pageid, controlid, callback) {
      var url = 'http://' + config.host + ':' + config.port + config.context + '/mycontenthandler/?uri=pm:oid:' + controlid + '@oid:' + pageid;

      request.get({
          url: url,
          headers: {
            "Authorization": auth,
            "Accept": "application/json"
          }
        }, function(error, response, body) {
          console.log(body);
          var xpath = require('xpath'),
            dom = require('xmldom').DOMParser
          var doc = new dom().parseFromString(body)
          var select = xpath.useNamespaces({
            "atom": "http://www.w3.org/2005/Atom"
          });
          var nodes = select("//atom:link[@rel='related']/@href", doc);
          console.log(nodes);

          if (nodes != null && nodes.length == 1) {
            var entityURL = 'http://' + config.host + ':' + config.port + nodes[0].nodeValue;

            request.get({
              url: entityURL,
              headers: {
                "Authorization": auth,
                "Accept": "application/json"
              }
            }, function(error, response, body) {
              var xpath = require('xpath'),
                dom = require('xmldom').DOMParser
              var doc = new dom().parseFromString(body)
              var select = xpath.useNamespaces({
                "atom": "http://www.w3.org/2005/Atom",
                "model": "http://www.ibm.com/xmlns/prod/websphere/portal/v6.0.1/portal-model-elements",
                "base": "http://www.ibm.com/xmlns/prod/websphere/portal/v6.0/ibm-portal-composite-base"
              });
              var nodes = select("//model:portletpreferences[@name='WCM_CONTENT_CONTEXT_IDR']/base:value/@value", doc);
              if (nodes != null && nodes.length == 1) {
                // finally I have the contentitem id
                // console.log(nodes[0].nodeValue);
                callback(nodes[0].nodeValue);
              }
            });
          }
        }

      );
    }

  }
  RED.nodes.registerType("dx-server", DXServerNode);


  /**
   * Represents a content item
   **/
  function DXContentItemNode(config) {
    var METHOD = "DXContentItemNode";
    logger.debug(METHOD + config);

    RED.nodes.createNode(this, config);
    var node = this;

    var parent = config.parent;
    var template = config.template;

    var action = config.action;

    var portalserver = RED.nodes.getNode(config.server);

    try {
      this.on("input", function(msg) {
        if (msg != null) {
          console.log(msg);

          if (action == 'topic' && msg.topic) {
            action = msg.topic;
          }

          msg.contentitem = msg.contentitem || {};

          switch (action) {
            case "update":
              msg.contentitem.name = msg.contentitem.name || msg.payload
              msg.contentitem.parent = msg.contentitem.parent || parent;
              msg.contentitem.template = msg.contentitem.template || template;

              var create = false;

              portalserver.locateContentItem(msg.contentitem,function(entry){
                if (entry) {
                    console.log(entry);
                    portalserver.updateContentItem(entry,msg.contentitem,function(error, response, body) {
                      if (error == undefined && body.entry) {
                        console.log(body.entry.id);
                        // ugh, this is ugly
                        msg.contentitem.id = body.entry.id.substring(8);
                        node.send(msg);
                      } else {
                        node.warn(body);
                      }
                    });
                } else {
                    // ok, I did not find an existing item, so we can just let it go and create
                    // a new one
                    create = true;
                    console.log("no existing item was found with for ",msg.contentitem.name);
                    portalserver.createContentItem(msg.contentitem,
                      function(error, response, body) {
                        if (error == undefined && body.entry) {
                          console.log(body.entry.id);
                          // ugh, this is ugly
                          msg.contentitem.id = body.entry.id.substring(8);
                          node.send(msg);
                        } else {
                          node.warn(body);
                        }
                      });
                }
              });
              break;
            case "create":
              msg.contentitem.name = msg.contentitem.name || msg.payload
              msg.contentitem.parent = msg.contentitem.parent || parent;
              msg.contentitem.template = msg.contentitem.template || template;
              portalserver.createContentItem(msg.contentitem,
                function(error, response, body) {
                  if (error == undefined && body.entry) {
                    console.log(body.entry.id);
                    // ugh, this is ugly
                    msg.contentitem.id = body.entry.id.substring(8);
                    node.send(msg);
                  } else {
                    node.warn(body);
                  }
                });
              break;
            case "locate":
              console.log("trigger locate");
              msg.contentitem.pageid = msg.payload.pageid || msg.contentitem.pageid;
              msg.contentitem.controlid = msg.payload.controlid || msg.contentitem.controlid;

              portalserver.findContentItem(msg.contentitem.pageid, msg.contentitem.controlid, function(contentid) {
                node.log("Found contentitem with id " + contentid);
                msg.contentitem.id = contentid;
                node.send(msg);
              });
              break;

            case "updateConfig":
              if (msg.contentitem.id) {
                msg.contentitem.pageid = msg.payload.pageid || msg.contentitem.pageid;
                msg.contentitem.controlid = msg.payload.controlid || msg.contentitem.controlid;

                var parameters = [{
                  "name": "WCM_CONTENT_CONTEXT_IDR",
                  "value": msg.contentitem.id
                }];

                portalserver.updatePortletConfig(msg.contentitem.pageid, msg.contentitem.controlid, parameters, function(response) {
                  node.send(msg);
                });
              } else {
                node.warn("No contentitem is set at msg.contentitem.id");
              }
              break;

            default:
              node.warn("No valid action was found for value [" + action + "]");
              break;
          }
        };
      });
    } catch (error) {
      node.warn(error);
    }

  }
  RED.nodes.registerType("dx-content-item", DXContentItemNode);



  function DXContentElement(config) {
    var METHOD = "DXContentElement";
    logger.debug(METHOD + config);

    RED.nodes.createNode(this, config);
    var node = this;

    var action = config.action;
    var portalserver = RED.nodes.getNode(config.server);

    this.on("input", function(msg) {
      if (msg != null) {
        console.log(msg);

        if (action == 'topic' && msg.topic) {
          action = msg.topic;
        }
        switch (action) {
          case "update":
            switch (config.elementconfig) {
              case "dynamic":
                // nothing to do here as we assume the elementData is already seeded
                break;
              case "preset":
                msg.contentitem.elementData = [{
                  "name": config.elementname,
                  "contenttype": config.mimetype,
                  "data": msg.payload
                }];
                break;
            }

            if (msg.contentitem.id && msg.contentitem.elementData) {
              portalserver.updateContentElement(msg.contentitem.id, msg.contentitem.elementData, function(contentid) {
                msg.status = "success";
                node.send(msg);
              });
            } else {
              node.warn("No contentitem is set at msg.contentitem.id");
            }
            break;
          default:
            break;
        }
      };
    });
  }
  RED.nodes.registerType("dx-content-element", DXContentElement);



  function DXProject(config) {
    var METHOD = "DXProject";
    logger.debug(METHOD, config);
    RED.nodes.createNode(this, config);

    var node = this;
    var action = config.action;
    var serverconfig = RED.nodes.getNode(config.server);

    this.on("input", function(msg) {
      if (msg != null) {
        logger.debug(METHOD,msg);

        if (action == 'topic' && msg.topic) {
          action = msg.topic;
        }

        var projectMetadata = msg.project || {};
        projectMetadata.name = msg.project.name || msg.payload;
        projectMetadata.title = msg.project.title || {}
        projectMetadata.description = msg.project.description || {}

        var portalserver = dx(serverconfig.getConfig());

        switch (action) {
          case "create":
            node.status({fill:"green",shape:"ring",text:"processing"});

            var p = portalserver.createProject(projectMetadata);
            p.then(function(project) {
              msg.project = project;
              node.send(msg);
              node.status({});
            }).catch(function(error) {
              node.warn(error);
              node.status({});
            });
            break;
          case "review":
            break;
          case "approve":
            break;
          case "reject":
            break;
          default:
            break;
        }
      };
    });
  }
  RED.nodes.registerType("dx-project", DXProject);

  function DXContentQuery(config) {
    var METHOD = "DXContentQuery";
    logger.debug(METHOD,config);
    RED.nodes.createNode(this, config);

    var node = this;

    var portalserver = RED.nodes.getNode(config.server);

    this.on("input", function(msg) {
      if (msg != null) {
        logger.debug(METHOD,msg);

        if(msg.query) {
          if(msg.loop) {
            if (msg.loop.count < msg.loop.total) {
              msg.loop.element = msg.result[msg.loop.count];
              msg.loop.count++;

              msg.contentitem.id = msg.loop.element.id.substring(8);

              node.send([msg,undefined]);
            } else {
              msg.loop = undefined;
              msg.contentitem.id = undefined;
              node.send([undefined,msg]);
            }
          } else {
            portalserver.queryContent(msg.query,function(result) {
              if (result && result.length > 0) {
                msg.loop = {};
                msg.loop.count = 1;
                msg.loop.total = result.length;

                msg.loop.element = result[0];
                msg.contentitem = msg.contentitem || {};
                msg.contentitem.id = msg.loop.element.id.substring(8);

                msg.result = result;

                node.send([msg,undefined]);
              } else {
                node.send([undefined,msg]);
              }
            });
          }
        }

      };
    });
  }
  RED.nodes.registerType("dx-content-query", DXContentQuery);



}
