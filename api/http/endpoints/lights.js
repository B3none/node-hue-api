'use strict';

const ApiEndpoint = require('./endpoint')
  , LightIdPlaceholder = require('../placeholders/LightIdPlaceholder')
  , LightStateBase = require('../../../bridge-model/lightstate/States')
  , ApiError = require('../../ApiError')
  , utils = require('../../../hue-api/utils')
  , builder = require('../../../bridge-model')
;

module.exports = {

  getAllLights: new ApiEndpoint()
    .version('1.0')
    .get()
    .uri('/api/<username>/lights')
    .acceptJson()
    .pureJson()
    .postProcess(buildLightsResult),

  getNewLights: new ApiEndpoint()
    .version('1.0')
    .get()
    .uri('/api/<username>/lights/new')
    .acceptJson()
    .pureJson(),

  searchForNewLights: new ApiEndpoint()
    .post()
    .uri('/api/<username>/lights')
    .acceptJson()
    .pureJson()
    .postProcess(utils.wasSuccessful),

  getLightAttributesAndState: new ApiEndpoint()
    .get()
    .uri('/api/<username>/lights/<id>')
    .placeholder(new LightIdPlaceholder())
    .acceptJson()
    .pureJson()
    .postProcess(injectLightId),

  // rename lights
  setLightAttributes: new ApiEndpoint()
    .put()
    .uri('/api/<username>/lights/<id>')
    .placeholder(new LightIdPlaceholder())
    .acceptJson()
    .pureJson()
    .payload(buildLightNamePayload)
    .postProcess(utils.wasSuccessful),

  setLightState: new ApiEndpoint()
    .put()
    .uri('/api/<username>/lights/<id>/state')
    .placeholder(new LightIdPlaceholder())
    .acceptJson()
    .pureJson()
    .payload(buildLightStateBody)
    .postProcess(validateLightStateResult),

  deleteLight: new ApiEndpoint()
    .delete()
    .uri('/api/<username>/lights/<id>')
    .placeholder(new LightIdPlaceholder())
    .acceptJson()
    .pureJson()
};

function buildLightsResult(result) {
  let lights = [];

  if (result) {
    Object.keys(result).forEach(function (id) {
      lights.push(builder.buildLight(id, result[id]));
    });
  }

  return {'lights': lights};
}

function buildLightNamePayload(parameters) {
  const nameMaxLength = 32
    , result = {type: 'application/json'}
    , name = parameters['name']
  ;

  if (name && name.length > 0) {
    result.body = {name: name};

    if (name.length > nameMaxLength) {
      throw new ApiError('Light name is too long');
    }
  }

  return result;
}

function injectLightId(result, requestParameters) {
  return Object.assign({id: requestParameters.id}, result);
}

function buildLightStateBody(parameters) {
  // let state = lightState.createGroup();
  const payload = getStateForDevice(parameters.device, parameters.state);
  return {type: 'application/json', body: payload};
}

function validateLightStateResult(result) {
  if (!utils.wasSuccessful(result)) {
    throw new ApiError(utils.parseErrors(result).join(', '));
  }
  return true;
}

function getStateForDevice(device, desiredState) {
  if (! device) {
    throw new ApiError('No light device provided');
  }

  const allowedStates = device.getSupportedStates()
    , state = {}
  ;

  // Only allow the setting of parameters that the light supports in its state (e.g. do not set a color on a white light
  if (desiredState instanceof(LightStateBase)) {
    const desiredStatePayload = desiredState.getPayload();
    Object.keys(desiredStatePayload).forEach(desiredStateKey => {
      if (allowedStates.indexOf(desiredStateKey) > -1) {
        state[desiredStateKey] = desiredStatePayload[desiredStateKey];
      }
    });
  } else {
    //TODO needs to be finished
    console.log(JSON.stringify(desiredState));
  }
  return state;
}