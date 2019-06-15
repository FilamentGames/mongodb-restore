
/**
 * @file mongodb-restore main
 * @module mongodb-restore
 * @subpackage main
 * @version 1.6.0
 * @author hex7c0 <hex7c0@gmail.com>
 * @copyright hex7c0 2014
 * @license GPLv3
 */

/*
 * initialize module
 */
const systemRegex = /^system\./;
const fs = require('graceful-fs');
const path = require('path');
let BSON;
let logger;
let meta;

/*
 * functions
 */
/**
 * error handler
 *
 * @function error
 * @param {Object} err - raised error
 */
function error (err) {

  if (err) {

    logger(err.message);

  }

}

/**
 * read collection metadata from file
 *
 * @function readMetadata
 * @param {Object} collection - db collection
 * @param {String} metadata - path of metadata
 * @param {Function} next - callback
 */
function readMetadata (collection, metadata, next) {

  let doc, data;

  try {

    data = fs.readFileSync(metadata + collection.collectionName);

  } catch (err) {

    return next(null);

  }
  try {

    doc = JSON.parse(data);

  } catch (err) {

    return next(err);

  }

  let last = ~~doc.length,
    counter = 0;

  if (last === 0) {

    return next(null);

  }

  doc.forEach(function (index) {

    collection.createIndex(index.key, index, function (err) {

      if (err) {

        return last === ++counter ? next(err) : error(err);

      }

      return last === ++counter ? next(null) : null;

    });

  });

}

/**
 * make dir
 *
 * @function makeDir
 * @param {String} pathname - pathname of dir
 * @param {Function} next - callback
 */
function makeDir (pathname, next) {

  fs.stat(pathname, function (err, stats) {

    if (err && err.code === 'ENOENT') {

      logger('make dir at ' + pathname);

      return fs.mkdir(pathname, function (err) {

        next(err, pathname);

      });

    } else if (stats && stats.isDirectory() === false) {

      logger('unlink file at ' + pathname);

      return fs.unlink(pathname, function () {

        logger('make dir at ' + pathname);
        fs.mkdir(pathname, function (err) {

          next(err, pathname);

        });

      });

    }

    next(null, pathname);

  });

}

/**
 * remove dir
 *
 * @function rmDir
 * @param {String} pathname - path of dir
 * @param {Function} [next] - callback
 */
function rmDir (pathname, next) {

  fs.readdirSync(pathname).forEach(function (first) { // database

    const database = pathname + first;

    if (fs.statSync(database).isDirectory() === false) {

      return;

    }

    let metadata = '';
    const collections = fs.readdirSync(database);
    const metadataPath = path.join(database, '.metadata');

    if (fs.existsSync(metadataPath) === true) {

      metadata = metadataPath + path.sep;
      delete collections[collections.indexOf('.metadata')]; // undefined is not a dir

    }

    collections.forEach(function (second) { // collection

      const collection = path.join(database, second);

      if (fs.statSync(collection).isDirectory() === false) {

        return;

      }
      fs.readdirSync(collection).forEach(function (third) { // document

        const document = path.join(collection, third);

        fs.unlinkSync(document);

        return next ? next(null, document) : '';

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

/**
 * JSON parser
 *
 * @function fromJson
 * @param {Object} collection - collection model
 * @param {String} collectionPath - path of collection
 * @param {Function} next - callback
 */
function fromJson (collection, collectionPath, next) {

  const docsBulk = [];
  const docs = fs.readdirSync(collectionPath);
  let last = ~~docs.length,
    counter = 0;

  if (last === 0) {

    return next(null);

  }

  docs.forEach(function (docName) {

    let doc, data;

    try {

      data = fs.readFileSync(collectionPath + docName);

    } catch (err) {

      return last === ++counter ? next(null) : null;

    }
    try {

      doc = JSON.parse(data);

    } catch (err) {

      return last === ++counter ? next(err) : error(err);

    }

    docsBulk.push({
      insertOne: {
        document: doc,
      },
    });

    return last === ++counter ? collection.bulkWrite(docsBulk, next) : null;

  });

}

/**
 * BSON parser
 *
 * @function fromBson
 * @param {Object} collection - collection model
 * @param {String} collectionPath - path of collection
 * @param {Function} next - callback
 */
function fromBson (collection, collectionPath, next) {

  const docsBulk = [];
  const docs = fs.readdirSync(collectionPath);
  let last = ~~docs.length,
    counter = 0;

  if (last === 0) {

    return next(null);

  }

  docs.forEach(function (docName) {

    let doc, data;

    try {

      data = fs.readFileSync(collectionPath + docName);

    } catch (err) {

      return last === ++counter ? next(null) : null;

    }
    try {

      doc = BSON.deserialize(data);

    } catch (err) {

      return last === ++counter ? next(err) : error(err);

    }

    docsBulk.push({
      insertOne: {
        document: doc,
      },
    });

    return last === ++counter ? collection.bulkWrite(docsBulk, next) : null;

  });

}

/**
 * set data to all collections available
 *
 * @function allCollections
 * @param {Object} db - database
 * @param {String} name - path of database
 * @param {String} metadata - path of metadata
 * @param {Function} parser - data parser
 * @param {Function} next - callback
 */
function allCollections (db, name, metadata, parser, next) {

  const collections = fs.readdirSync(name);
  let last = ~~collections.length,
    counter = 0;

  if (last === 0) { // empty set

    return next(null);

  }

  if (collections.indexOf('.metadata') >= 0) { // undefined is not a dir

    delete collections[collections.indexOf('.metadata')];
    last--;

  }

  collections.forEach(function (collectionName) {

    const collectionPath = name + collectionName;

    if (!fs.statSync(collectionPath).isDirectory()) {

      const err = new Error(collectionPath + ' is not a directory');

      return last === ++counter ? next(err) : error(err);

    }
    db.createCollection(collectionName, function (err, collection) {

      if (err) {

        return last === ++counter ? next(err) : error(err);

      }
      logger('select collection ' + collectionName);
      meta(collection, metadata, function (err) {

        if (err) {

          error(err);

        }
        parser(collection, collectionPath + path.sep, function (err) {

          if (err) {

            return last === ++counter ? next(err) : error(err);

          }

          return last === ++counter ? next(null) : null;

        });

      });

    });

  });

}

/**
 * drop data from some collections
 *
 * @function someCollections
 * @param {Object} db - database
 * @param {Array} collections - selected collections
 * @param {Function} next - callback
 */
function someCollections (db, collections, next) {

  let last = ~~collections.length,
    counter = 0;

  if (last === 0) { // empty set

    return next(null);

  }

  collections.forEach(function (collection) {

    db.collection(collection, function (err, collection) {

      logger('select collection ' + collection.collectionName);
      if (err) {

        return last === ++counter ? next(err) : error(err);

      }
      collection.drop(function (err) {

        if (err) {

          error(err); // log if missing

        }

        return last === ++counter ? next(null) : null;

      });

    });

  });

}

/**
 * function wrapper
 *
 * @function wrapper
 * @param {Object} my - parsed options
 */
function wrapper (my) {

  let parser;

  if (typeof my.parser === 'function') {

    parser = my.parser;

  } else {

    switch (my.parser.toLowerCase()) {

    case 'bson':
      BSON = require('bson');
      parser = fromBson;
      break;
    case 'json':
      // JSON error on ObjectId and Date
      parser = fromJson;
      break;
    default:
      throw new Error('missing parser option');

    }

  }

  const discriminator = allCollections;

  if (!my.logger || ['function', 'string'].indexOf(typeof my.logger) === -1) {

    logger = function () {

      return;

    };

  } else {

    if (typeof my.logger === 'function') {

      logger = my.logger;

      return;

    }

    logger = require('logger-request')({
      filename: path.resolve(my.logger),
      standalone: true,
      daily: true,
      winston: {
        logger: '_mongo_r' + path.resolve(my.logger),
        level: 'info',
        json: false,
      },
    });
    logger('restore start');
    const log = require('mongodb').Logger;

    log.setLevel('info');
    log.setCurrentLogger(function (msg) {

      logger(msg);

    });

  }

  let metadata = '';

  if (my.metadata === true) {

    meta = readMetadata;

  } else {

    meta = function (a, b, c) {

      return c();

    };

  }

  /**
   * latest callback
   *
   * @return {Null}
   */
  function callback (err) {

    logger('restore stop');
    if (my.tar) {

      rmDir(my.dir);

    }

    if (my.callback !== null) {

      logger('callback run');
      my.callback(err);

    } else if (err) {

      logger(err);

    }

  }

  /**
   * entry point
   *
   * @return {Null}
   */
  function go (root) {

    if (my.metadata === true) {

      metadata = path.join(root, '.metadata', path.sep);

    }
    require('mongodb').MongoClient.connect(my.uri, my.options,
      function (err, db) {

        logger('db open');
        if (err) {

          return callback(err);

        }

        function next (err) {

          if (err) {

            logger('db close');
            db.close();

            return callback(err);

          }

          // waiting for `db.fsyncLock()` on node driver
          discriminator(db, root, metadata, parser, function (err) {

            logger('db close');
            db.close();
            callback(err);

          });

        }

        if (my.drop === true) {

          logger('drop database');

          return db.dropDatabase(next);

        } else if (my.dropCollections) {

          logger('drop collections');
          if (Array.isArray(my.dropCollections) === true) {

            return someCollections(db, my.dropCollections, next);

          }

          return db.collections(function (err, collections) {

            if (err) { // log if missing

              error(err);

            }
            my.dropCollections = [];
            for (let i = 0, ii = collections.length; i < ii; ++i) {

              const collectionName = collections[i].collectionName;

              if (systemRegex.test(collectionName) === false) {

                my.dropCollections.push(collectionName);

              }

            }
            someCollections(db, my.dropCollections, next);

          });

        }

        next(null);

      });

  }

  if (!my.tar) {

    return go(my.root);

  }

  makeDir(my.dir, function () {

    const extractor = require('tar').x({
      path: my.dir,
    })
      .on('error', callback)
      .on('end', function () {

        const dirs = fs.readdirSync(my.dir);

        for (let i = 0, ii = dirs.length; i < ii; ++i) {

          const t = my.dir + dirs[i];

          if (fs.statSync(t).isFile() === false) {

            return go(t + path.sep);

          }

        }

      });

    if (my.stream !== null) { // user stream

      logger('get tar file from stream');
      my.stream.pipe(extractor);

    } else { // filesystem stream

      logger('open tar file at ' + my.root + my.tar);
      fs.createReadStream(my.root + my.tar).on('error', callback)
        .pipe(
          extractor);

    }

  });

}

/**
 * option setting
 *
 * @exports restore
 * @function restore
 * @param {Object} options - various options. Check README.md
 */
function restore (options) {

  const opt = options || Object.create(null);

  if (!opt.uri) {

    throw new Error('missing uri option');

  }
  if (!opt.stream) {

    if (!opt.root) {

      throw new Error('missing root option');

    } else if (!fs.existsSync(opt.root) || !fs.statSync(opt.root).isDirectory()) {

      throw new Error('root option is not a directory');

    }

  }

  const my = {
    dir: path.join(__dirname, 'dump', path.sep),
    uri: String(opt.uri),
    root: path.resolve(String(opt.root)) + path.sep,
    stream: opt.stream || null,
    parser: opt.parser || 'bson',
    callback: typeof opt.callback === 'function' ? opt.callback : null,
    tar: typeof opt.tar === 'string' ? opt.tar : null,
    logger: opt.logger,
    metadata: Boolean(opt.metadata),
    drop: Boolean(opt.drop),
    dropCollections: opt.dropCollections ? opt.dropCollections : null,
    options: typeof opt.options === 'object' ? opt.options : {},
  };

  if (my.stream) {

    my.tar = true; // override

  }
  wrapper(my);

}
module.exports = restore;
