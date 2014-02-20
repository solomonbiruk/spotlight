
/**
 * Module dependencies.
 */

var request = require('superagent');
var Emitter = require('emitter');
var assert = require('assert');
var parse = require('elucene');

/**
 * Expose `ES`.
 */

module.exports = ES;

/**
 * Initialize a new ES client.
 *
 * @param {Object} opts
 * @api public
 */

function ES(opts) {
  assert(opts.url, 'elastic search --url required');
  this.url = opts.url;
}

/**
 * Respond with stats.
 *
 * @param {Function} fn
 * @api public
 */

ES.prototype.stats = function(fn){
  var url = this.url + '/_stats';

  request
  .get(url)
  .end(function(err, res){
    if (err) return fn(err);
    if (res.error) return fn(res.error);
    fn(null, res.body);
  });
};

/**
 * Respond with counts for query `str`.
 *
 * @param {String} str
 * @param {Function} fn
 * @api public
 */

ES.prototype.count = function(str, fn){
  // parse
  var query = parse(str);
  var str = query.string || '*';

  // url
  debug('count %j', str);
  var url = this.url + '/_count';

  request
  .get(url)
  .query({ q: str })
  .end(function(err, res){
    if (err) return fn(err);
    if (res.error) return fn(res.error);
    fn(null, res.body);
  });
};

/**
 * Query with `str` and return an emitter.
 *
 * @param {String} str
 * @param {Object} opts
 * @return {Emitter}
 * @api public
 */

ES.prototype.query = function(str, opts){
  var e = new Emitter;
  opts = opts || {};

  // parse
  var query = parse(str);
  var str = query.string || '*';

  // options
  var size = (query.limit && query.limit[0]) || opts.limit || 10;
  var sort = (query.sort && query.sort[0]) || 'timestamp:desc';

  // url
  var url = this.url + '/_search';

  request
  .get(url)
  .query({ q: str, size: size, sort: sort })
  .end(function(err, res){
    if (err) return e.emit('error', err);
    if (res.error) return e.emit('error', res.error);
    var logs = res.body.hits;

    logs.hits.map(normalize(query.fields)).forEach(function(log){
      e.emit('data', log);
    });

    e.emit('end');
  });

  return e;
};

/**
 * Normalize logs with optional field filtering.
 */

function normalize(fields) {
  return function(log){
    log = log._source;
    if (fields) log.message = only(log.message, fields);
    return log;
  }
}

/**
 * Filter fields.
 */

function only(obj, fields) {
  var ret = {};
  console.log(fields);

  fields.forEach(function(field){
    ret[field] = obj[field];
  });

  return ret;
}