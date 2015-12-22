'use strict';

var express = require('express');
var controller = require('./locatable.controller');
var auth = require('../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.get('/:upperleftlong(-?\\d+.\\d+)/:upperleftlat(-?\\d+.\\d+)/:lowerrightlong(-?\\d+.\\d+)/:lowerrightlat(-?\\d+.\\d+)/:bodytype?', controller.getInBox); //(-?\\d+(.\\d+)?) didn't work. Parsed lowerleftlong correctly but lowerleftlat was decimal of lowerleftlong (??)
router.get('/:id', controller.show);
router.post('/', auth.isAuthenticated(), controller.create);
router.put('/:id', auth.isAuthenticated(), controller.isCreator, controller.update);
router.patch('/:id', auth.isAuthenticated(), controller.isCreator, controller.update);
router.delete('/:id', auth.isAuthenticated(), controller.isCreator, controller.destroy);

module.exports = router;
