'use strict';

angular.module('core').factory('TodoStorage', [
	function() {
		// Todostorage service logic
		// ...

        var STORAGE_ID = 'todoGenius';

        return {
            get: function () {
                return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
            },

            put: function (todos) {
                localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
            }
        };
	}
]);