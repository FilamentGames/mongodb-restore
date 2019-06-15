
/**
 * @file z test
 * @module mongodb-restore
 * @subpackage test
 * @version 0.0.1
 * @author hex7c0 <hex7c0@gmail.com>
 * @license GPLv3
 */

/*
 * initialize module
 */
let assert = require('assert');
let fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../.env` });


/*
 * test module
 */
describe('last', function () {

  let ROOT = __dirname + '/dump/';

  describe('tar', function () {

    it('should unlink tar0 file', function (done) {

      fs.unlink(ROOT + 't1.tar', done);

});
    it('should unlink tar1 file', function (done) {

      fs.unlink(ROOT + 't_stream.tar', done);

});

});

  describe('directory', function () {

    function rmDir (path, next) {

      fs.readdirSync(path).forEach(function (first) { // database

        let database = path + first;

        assert.equal(fs.statSync(database).isDirectory(), true);
        let metadata = '';
        let collections = fs.readdirSync(database);

        if (fs.existsSync(database + '/.metadata') === true) {

          metadata = database + '/.metadata/';
          delete collections[collections.indexOf('.metadata')]; // undefined is not a dir

}
        collections.forEach(function (second) { // collection

          let collection = database + '/' + second;

          if (fs.statSync(collection).isDirectory() === false) {

            return;

}
          fs.readdirSync(collection).forEach(function (third) { // document

            let document = collection + '/' + third;

            if (next !== undefined) {

              next(null, document);

}
            fs.unlinkSync(document);

});
          if (metadata !== '') {

            fs.unlinkSync(metadata + second);

}
          fs.rmdirSync(collection);

});
        if (metadata !== '') {

          fs.rmdirSync(metadata);

}
        fs.rmdirSync(database);

});

}
    it('should rm db directory', function (done) {

      rmDir(ROOT);
      done();

});

});

});
