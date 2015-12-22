/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Locatable = require('./locatable.model');

exports.register = function(socket) {
  Locatable.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  Locatable.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('locatable:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('locatable:remove', doc);
}