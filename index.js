
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

    logger.error('Error', err);

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

      logger.info('Creating directory at ' + pathname);

      return fs.mkdir(pathname, function (err) {

        next(err, pathname);

      });

    } else if (stats && stats.isDirectory() === false) {

      logger.info('Unlinking file at ' + pathname);

      return fs.unlink(pathname, function () {

        logger.info('Creating directory at ' + pathname);

        fs.mkdir(pathname, function (mkDirErr) {

          logger.error('Creating directory failed.', mkDirErr);

          next(mkDirErr, pathname);

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

      logger.info('Selecting collection ' + collectionName);

      meta(collection, metadata, function (metaErr) {

        if (metaErr) {

          logger.error('Meta failed.', metaErr);

        }

        parser(collection, collectionPath + path.sep, function (parserErr) {

          if (parserErr) {

            return last === ++counter ? next(parserErr) : error(parserErr);

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

      logger.info('Selecting collection ' + collection.collectionName);
      if (err) {

        return last === ++counter ? next(err) : error(err);

      }
      collection.drop(function (dropErr) {

        if (dropErr) {

          error(dropErr); // log if missing

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


  if (typeof my.logger === 'string' || Array.isArray(my.logger)) {

    logger = require('./logger')(my.logger);

  } else {

    logger = require('./logger')();

  }


  logger.info('Restoration starting.');

  const log = require('mongodb').Logger;

  log.setLevel('info');
  log.setCurrentLogger(function (msg) {

    logger.info(msg);

  });

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

    logger.info('Restoration ended.');

    if (my.tar) {

      rmDir(my.dir);

    }

    if (my.callback !== null) {

      my.callback(err);

    } else if (err) {

      logger.error('Restoration failed.', err);

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
      function (err, _client) {

        logger.info('Connected to the database.');

        if (err) {


          logger.error('Connecting to database failed.', err);

          return callback(err);

        }

        function next (nextErr) {

          if (nextErr) {

            logger.error('Next failed.', nextErr);

            _client.close();

            return callback(nextErr);

          }

          // waiting for `db.fsyncLock()` on node driver
          discriminator(_client, root, metadata, parser, function (discriminatorErr) {

            if (discriminatorErr) {

              logger.error('Discriminator failed.', discriminatorErr);

              _client.close();

              callback(discriminatorErr);

            }

          });

        }

        if (my.drop === true) {

          logger.info('Dropping database.');

          return _client.db().dropDatabase(next);

        } else if (my.dropCollections) {

          logger.info('Dropping collections.');

          if (Array.isArray(my.dropCollections) === true) {

            return someCollections(_client, my.dropCollections, next);

          }

          return _client.collections(function (err, collections) {

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
            someCollections(_client, my.dropCollections, next);

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
      C: my.dir,
    })
      .on('error', (tarErr) => {

        logger.error('Extracting tar failed.', tarErr);

      })
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

      logger.info('Getting tar file from stream.');

      my.stream.pipe(extractor);

    } else { // filesystem stream

      logger.info('Opening tar file at ' + my.root + my.tar);

      fs.createReadStream(my.root + my.tar)
        .on('error', (err) => {

          logger.error('Opening tar file failed.', err);

          callback(err);

        })
        .pipe(extractor);

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
