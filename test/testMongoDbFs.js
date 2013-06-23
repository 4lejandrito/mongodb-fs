var util = require('util')
  , nodeunit = require('nodeunit')
  , mongodbFs = require('../lib/mongodb-fs')
  , mongoose = require('mongoose')
  , path = require('path')
  , Profess = require('profess')
  , helper = require('../lib/helper')
  , log = helper.log
  , config, schema, dbConfig, dbOptions;

config = {
  port: 27027,
  mocks: require('./mocks'),
  logLevel: 'debug',
  verbose: true,
  colors: true,
  fork: true
};

schema = {
  field1: String,
  field2: {
    field3: Number,
    field4: String
  }
};

dbConfig = {
  name: 'fakedb'
};
dbConfig.url = util.format('mongodb://localhost:%d/%s', config.port, dbConfig.name);

dbOptions = {
  server: { poolSize: 1 }
};

mongoose.model('Item', schema);

exports.setUp = function (callback) {
  var profess;
  profess = new Profess();
  profess.
    do(function () {
      helper.init(config);
      //return profess.next();
      if (!mongodbFs.isRunning()) {
        mongodbFs.init(config);
        log('trace', 'init');
        mongodbFs.start(profess.next);
        nodeunit.on('complete', function () {
          mongodbFs.stop();
        });
      } else {
        profess.next();
      }
    }).
    then(function () {
      log('trace', 'connect to db');
      mongoose.connect(dbConfig.url, dbOptions, profess.next);
    }).
    then(callback);
};

exports.tearDown = function (callback) {
  log('trace', 'disconnect');
  mongoose.disconnect(callback);
};

exports.testFindAll = function (test) {
  var Item;
  log('trace', 'testFindAll');
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  Item.find(function (err, items) {
    test.ifError(err);
    test.ok(items);
    test.equal(items.length, 3);
    test.done();
  });
};

exports.testFindFilter1 = function (test) {
  var Item;
  log('trace', 'testFindFilter1');
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  Item.find({ 'field2.field3': { $gt: 32 } }, function (err, items) {
    test.ifError(err);
    test.ok(items);
    test.equal(items.length, 1);
    if (items.length) {
      test.equal(items[0].field2.field3, 33);
    }
    test.done();
  });
};

exports.testFindFilter2 = function (test) {
  var Item;
  log('trace', 'testFindFilter2');
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  Item.find({ 'field2.field3': { $gt: 32 } }, function (err, items) {
    test.ifError(err);
    test.ok(items);
    test.equal(items.length, 1);
    if (items.length) {
      test.equal(items[0].field2.field3, 33);
    }
    test.done();
  });
};

exports.testInsert = function (test) {
  var Item, item;
  log('trace', 'testInsert');
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  item = new Item({
    field1: 'value101',
    field2: {
      field3: 1031,
      field4: 'value104'
    }
  });
  item.save(function (err, savedItem) {
    test.ifError(err);
    test.ok(savedItem);
    test.done();
  });
};

exports.testRemove = function (test) {
  var Item;
  log('trace', 'testRemove');
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  Item.findOne({ 'field1': 'value101' }, function (err, item) {
    log('item :', item);
    test.ifError(err);
    test.ok(item);
    item.remove(function (err) {
      test.ifError(err);
      test.done();
    });
  });
};

exports.testCrud = function (test) {
  var Item, profess, noItems, errorHandler, item;
  test.ok(mongoose.connection.readyState);
  Item = mongoose.connection.model('Item');
  test.ok(Item);
  profess = new Profess();
  errorHandler = profess.handleError(function (err) {
    test.ifError(err);
    test.done();
  });
  profess.
    do(function () { // load all items
      Item.find(errorHandler);
    }).
    then(function (items) { // check
      test.ok(items);
      noItems = items.length;
      profess.next();
    }).
    then(function () { // insert item
      item = new Item({
        field1: 'value101',
        field2: {
          field3: 1031,
          field4: 'value104'
        }
      });
      item.save(errorHandler);
    }).
    then(function (item) { // check
      test.ok(item);
      profess.next();
    }).
    then(function (item) { // find item
      Item.findOne({ 'field2.field3': 1031 }, errorHandler);
    }).
    then(function (savedItem) { // check saved item
      test.equal(item.field1, savedItem.field1);
      test.equal(item.field2.field3, savedItem.field2.field3);
      test.equal(item.field2.field4, savedItem.field2.field4);
      profess.next();
    }).
    then(function () { // load all items
      Item.find(errorHandler);
    }).
    then(function (items) { // check
      test.ok(items);
      test.equal(items.length, noItems + 1);
      profess.next();
    }).
    then(function () { // update item
      item.field2.field3 = 2031;
      item.save(errorHandler);
    }).
    then(function (item) { // check
      test.ok(item);
      profess.next();
    }).
    then(function () { // remove item
      Item.remove({_id: item._id }, errorHandler);
    }).
    then(function () { // load all items
      Item.find(errorHandler);
    }).
    then(function (items) { // check
      test.ok(items);
      test.equal(items.length, noItems);
      profess.next();
    }).
    then(function () { // end
      test.done();
    });
};

// disabled tests :
delete exports.testCrud;
delete exports.testFindAll;
delete exports.testFindFilter1;
delete exports.testInsert;
delete exports.testRemove;

/*
 delete exports.testFindFilter2;
 */

module.exports = exports;