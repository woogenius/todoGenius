'use strict';


angular.module('core').controller('HomeController', ['$scope', '$location', '$filter', 'Authentication', 'TodoStorage',
	function($scope, $location, $filter, Authentication, TodoStorage) {
		// This provides Authentication context.
		$scope.authentication = Authentication;
        $scope.newTodo = '';
        $scope.editingTodo = null;

        var todos = $scope.todos = TodoStorage.get();

        $scope.$watch('todos', function (newValue, oldValue) {
            $scope.remainingCount = $filter('filter')(todos, { completed: false }).length;
            $scope.completedCount = todos.length - $scope.remainingCount;
            $scope.allChecked = !$scope.remainingCount;
            if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
                TodoStorage.put(todos);
            }
        }, true);

        // Monitor the current route for changes and adjust the filter accordingly.
        $scope.$on('$stateChangeSuccess', function () {
            var path = $location.path().split('/');
            var status = $scope.status = path[path.length-1] || '';

            $scope.statusFilter = (status === 'active') ?
            { completed: false } : (status === 'completed') ?
            { completed: true } : null;
        });

        $scope.addTodo = function () {
            var newTodo = $scope.newTodo.trim();
            if (!newTodo.length) {
                return;
            }

            todos.push({
                title: newTodo,
                completed: false
            });

            $scope.newTodo = '';
        };

        $scope.editTodo = function (todo) {
            $scope.editingTodo = todo;

            // Clone the original todo to restore it on demand.
            $scope.originalTodo = angular.extend({}, todo);
        };

        $scope.removeTodo = function (todo) {
            todos.splice(todos.indexOf(todo), 1);
        };

        $scope.doneEditing = function (todo) {
            $scope.editingTodo = null;
            todo.title = todo.title.trim();
            if (!todo.title) {
                $scope.removeTodo(todo);
            }
        };

        $scope.revertEditing = function (todo) {
            todos[todos.indexOf(todo)] = $scope.originalTodo;
            $scope.doneEditing($scope.originalTodo);
        };

        $scope.clearCompletedTodos = function () {
            // filter 함수 정리하기!!
            $scope.todos = todos = todos.filter(function (val) {
                return !val.completed;
            });
        };

        $scope.markAll = function (completed) {
            todos.forEach(function (todo) {
                todo.completed = !completed;
            });
        };
	}
]);