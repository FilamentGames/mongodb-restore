
/**
 * @file directory test
 * @module mongodb-restore
 * @subpackage test
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
let restore = require('..');
let assert = require('assert');
let fs = require('fs');
let client = require('mongodb').MongoClient;
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../.env` });

let URI = process.env.URI;
let URI2 = process.env.SRC_DB_URI;

/*
 * test module
 */
describe('empty directory', function () {

  let ROOT = __dirname;

  describe('issue10 - error handling crash', function () {

    it('should create another dir inside ROOT path', function (done) {

      fs.mkdir(ROOT + '/foobar', done);

});
    it('should save nothing, because path is empty (corrupt bson message)',
      function (done) {

        restore({
          uri: URI,
          root: ROOT,
          metadata: true,
          callback: function (err) {

            assert.equal(err, null);
            done();

},
        });

});
    it('should save nothing, because path is empty (corrupt json message)',
      function (done) {

        restore({
          uri: URI,
          root: ROOT,
          parser: 'json',
          metadata: true,
          callback: function (err) {

            assert.equal(err, null);
            done();

},
        });

});
    it('should delete dir inside ROOT path', function (done) {

      fs.rmdir(ROOT + '/foobar', done);

});

});

});
