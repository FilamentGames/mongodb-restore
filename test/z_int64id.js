
/**
 * @file issue #8 test
 * @module mongodb-restore
 * @subpackage test
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
const backup = require('mongodb-backup');
const restore = require('..');
const assert = require('assert');
const fs = require('fs');
const extname = require('path').extname;
const mongodb = require('mongodb');
const BSON = require('bson');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../.env` });

const client = mongodb.MongoClient;
const MLong = mongodb.Long;
const BLong = BSON.Long;
const URI = process.env.URI;
const URI2 = process.env.SRC_DB_URI
const Root = __dirname + '/dump';
const Collection = 'test_8';

/*
 * test module
 */
describe('int64 id', function () {

  describe('issue8 - parsed as a TimeStamp', function () {

    let NInt64, SInt64, NLong, SLong;

    describe('create new collection', function () {

      it('should create long number', function (done) {

        var long1 = MLong.fromNumber(100);
        var long2 = BLong.fromNumber(100);

        assert.deepEqual(long1, long2);
        var long1 = MLong.fromString('100');
        var long2 = BLong.fromString('100');

        assert.deepEqual(long1, long2);

        NInt64 = 1000576093407275579;
        SInt64 = '1000576093407275579';
        NLong = MLong.fromNumber(NInt64);
        SLong = MLong.fromString(SInt64);

        done();

      });
      it('should create "' + Collection + '" collection', function (done) {

        client.connect(URI2, function (err, db) {

          assert.ifError(err);
          db.createCollection(Collection, function (err, collection) {

            assert.ifError(err);
            collection.remove({}, function (err, result) { // remove previous data

              assert.ifError(err);
              collection.insert([{
                _id: 'nint64',
                d: NInt64,
                t: 'foo1',
              }, {
                _id: 'sint64',
                d: SInt64,
                t: 'foo2',
              }, {
                _id: 'nlong',
                d: NLong,
                t: 'foo3',
              }, {
                _id: 'slong',
                d: SLong,
                t: 'foo4',
              }], function (err, result) {

                assert.ifError(err);
                assert.equal(result.result.ok, 1);
                assert.equal(result.result.n, 4);
                db.close();
                done();

              });

            });

          });

        });

      });

    });

    describe('backup', function () {

      it('should build 1 directory and 4 files', function (done) {

        backup({
          uri: URI2,
          root: Root,
          collections: [Collection],
          callback: function (err) {

            assert.ifError(err);
            setTimeout(done, 500); // time for mongod

          },
        });

      });

    });

    describe('deserialize', function () {

      let database, collection;
      let nint64_file, nlong_file, sint64_file, slong_file;

      it('should find 2 files', function (done) {

        const first = fs.readdirSync(Root);

        assert.equal(first.length, 1, 'database');

        database = Root + '/' + first[0];
        assert.equal(fs.statSync(database).isDirectory(), true);

        const second = fs.readdirSync(database);

        assert.equal(second.length, 1, 'collection');
        assert.equal(second[0], Collection);

        collection = database + '/' + second[0];
        assert.equal(fs.statSync(collection).isDirectory(), true);

        const docs = fs.readdirSync(collection);

        assert.equal(docs.length, 4);
        nint64_file = collection + '/' + docs[0];
        nlong_file = collection + '/' + docs[1];
        sint64_file = collection + '/' + docs[2];
        slong_file = collection + '/' + docs[3];

        docs.forEach(function (file) {

          const p = collection + '/' + file;

          assert.equal(fs.statSync(p).isFile(), true);
          assert.equal(extname(p), '.bson');

        });

        done();

      });
      it('should deserialize nint64 file', function (done) {

        const data = BSON.deserialize(fs.readFileSync(nint64_file));

        assert.strictEqual(data._id, 'nint64');
        assert.deepEqual(data.d, NInt64);
        assert.strictEqual(data.t, 'foo1');
        done();

      });
      it('should deserialize sint64 file', function (done) {

        const data = BSON.deserialize(fs.readFileSync(sint64_file));

        assert.strictEqual(data._id, 'sint64');
        assert.deepEqual(data.d, SInt64);
        assert.strictEqual(data.t, 'foo2');
        done();

      });
      it('should deserialize nlong file', function (done) {

        const data = BSON.deserialize(fs.readFileSync(nlong_file));

        assert.strictEqual(data._id, 'nlong');
        assert.deepEqual(data.d, NLong);
        assert.strictEqual(data.t, 'foo3');
        done();

      });
      it('should deserialize slong file', function (done) {

        const data = BSON.deserialize(fs.readFileSync(slong_file));

        assert.strictEqual(data._id, 'slong');
        assert.deepEqual(data.d, SLong);
        assert.strictEqual(data.t, 'foo4');
        done();

      });

      describe('restore', function () {

        const ROOT = __dirname + '/dump/';

        it('should save data to db', function (done) {

          restore({
            uri: URI,
            root: ROOT,
            callback: function (err) {

              assert.ifError(err);
              setTimeout(done, 500); // time for mongod

            },
          });

        });
        it('should check "' + Collection + '" collection', function (done) {

          client.connect(URI, function (err, db) {

            assert.ifError(err);
            db.collection(Collection, function (err, collection) {

              assert.ifError(err);
              collection.find({
                _id: 'nint64',
              }).limit(1)
                .next(function (err, doc) {

                  assert.ifError(err);
                  assert.ok(doc);
                  assert.deepEqual(doc.d, NInt64);
                  assert.strictEqual(doc.t, 'foo1');
                  fs.unlinkSync(nint64_file);

                  collection.find({
                    _id: 'sint64',
                  }).limit(1)
                    .next(function (err, doc) {

                      assert.ifError(err);
                      assert.ok(doc);
                      assert.deepEqual(doc.d, SInt64);
                      assert.strictEqual(doc.t, 'foo2');
                      fs.unlinkSync(sint64_file);

                    });

                  collection.find({
                    _id: 'nlong',
                  }).limit(1)
                    .next(function (err, doc) {

                      assert.ifError(err);
                      assert.ok(doc);
                      assert.deepEqual(doc.d, NLong);
                      assert.strictEqual(doc.t, 'foo3');
                      fs.unlinkSync(nlong_file);

                    });

                  collection.find({
                    _id: 'slong',
                  }).limit(1)
                    .next(function (err, doc) {

                      assert.ifError(err);
                      assert.ok(doc);
                      assert.deepEqual(doc.d, SLong);
                      assert.strictEqual(doc.t, 'foo4');
                      fs.unlinkSync(slong_file);

                      db.close();
                      done();

                    });

                });

            });

          });

        });
        it('should remove dirs', function (done) {

          fs.rmdirSync(collection);
          fs.rmdirSync(database);
          done();

        });

      });

    });

  });

});
