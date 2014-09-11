'use strict';

// Setting up route
angular.module('core').config(['$stateProvider', '$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {
		// Redirect to home view when route not found
		$urlRouterProvider.otherwise('/');

		// Home state routing
		$stateProvider.
		state('home', {
			url: '/',
			templateUrl: 'modules/core/views/home.client.view.html'
		}).
		state('active', {
			url: '/active',
			templateUrl: 'modules/core/views/home.client.view.html'
		}).
		state('completed', {
			url: '/completed',
			templateUrl: 'modules/core/views/home.client.view.html'
		});
	}
]);
