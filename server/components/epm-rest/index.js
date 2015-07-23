'use strict';

var Epm = require('epm');
var path = require('path');
var _ = require('lodash');
var fs  = require('fs');
var express = require('express');

var manager = require('../epm-manager');

var transformQuery = function(part){

  if (_.isArray(part)){
    var a = [];
    part.forEach(function(p){
      a.push(transformQuery(p))
    });
    return a;
  }

  var q = {};

  _.forIn(part, function(value, key) {

    if (_.isObject(value) || _.isArray(value)) {
      q[key] = transformQuery(value);
    } else if (key === '$regex') {
      q[key] = new RegExp(value, 'ig');
    } else {
      q[key] = value;
    }

  });

  return q;
};

module.exports = function(){

  var router = express.Router();

  /*router.get('/repository/:reponame', function(req, res, next){
    var rname = req.params.reponame;
    getRepository(rname, function(err, repo){
      if (err) return next(err);

      repo
        .get('info')
        .fail(function(err){
          if (err) return next(err);
        })
        .done(function(pkgs){
          //console.log(Object.keys(pkgs.packages));
          res.json(pkgs);
      });

    });

  });*/

  router.post('/query/:repository', function(req, res, next){
    var rname = req.params.repository;

    manager
      .get(rname)
      .progress(function(info){

      })
      .fail(function(err){
        next(err);
      })
      .done(function(repo){
        var q = transformQuery(req.body);

        console.log(q);

        repo
        .find(q, function(err, items){
          res.json(items);
        });
      });

  });

  router.get('/asset/:repository/:uid/:type/:name', function(req, res, next){

    var rname = req.params.repository;
    var uid = req.params.uid;
    var asset = req.params.asset;
    var type = req.params.type;
    var name = req.params.name;

    manager
      .get(rname)
      .progress(function(info){

      })
      .fail(function(err){
        next(err);
      })
      .done(function(repo){
        repo
          .findOne({uid: uid}, function(err, pkg){

            if (err){
              console.log(err);
            }
            var info = {
              uid: uid,
              build: pkg.build || 1,
              filename: pkg.filename    
            };

            repo.engine.asset(repo, info, pkg, name, function(err, filename){
              if (err) { return next(err); }

              var options = {
                root: path.dirname(filename),
                dotfiles: 'deny',
                headers: {
                    'x-timestamp': Date.now(),
                    'x-sent': true
                }
              };

              res.sendfile(filename);
            });

          });
      });

  });

  return router;
};