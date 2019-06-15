
/**
 * @file parser test
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
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../.env` });

let URI = process.env.URI;

/*
 * test module
 */
describe('parser', function () {

  let ROOT = __dirname + '/dump';

  it('should check custom parser', function (done) {

    let c = 0;

    restore({
      uri: URI,
      root: ROOT,
      collections: ['logins'],
      parser: function (collections, name, next) {

        c++;
        assert.equal(typeof collections, 'object');
        assert.equal(typeof name, 'string');
        assert.equal(typeof next, 'function');
        next();

},
      callback: function (err) {

        assert.ifError(err);
        assert.equal(c > 0, true);
        done();

},
    });

});

});
