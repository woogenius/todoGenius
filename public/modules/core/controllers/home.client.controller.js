'use strict';

angular.module('core').controller('HomeController', ['$scope', '$location', '$filter', 'Authentication', 'TodoStorage',
	function($scope, $location, $filter, Authentication, TodoStorage) {
		// This provides Authentication context.
		$scope.authentication = Authentication;
        $scope.newTodo = '';
        $scope.editingTodo = null;

        var todos = $scope.todos = TodoStorage.get();

        // for google map
        var mapOptions = {
            zoom: 15,
            center: new google.maps.LatLng(37.402, 127.107),
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        var markers = {};

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
            var pos = [];
            if (!newTodo.length) {
                return;
            }

            todos.push({
                title: newTodo,
                completed: false
            });

            setTodoMarker(todos.length-1);

            $scope.newTodo = '';
        };

        function setTodoMarker (idx) {
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    var pos = [position.coords.latitude, position.coords.longitude];
                    todos[idx].pos = pos;
                    var latLng = new google.maps.LatLng(pos[0], pos[1]);
                    var marker = new google.maps.Marker({
                        position : latLng,
                        map : map,
                        animation: google.maps.Animation.DROP,
                        title : todos[idx].title
                    });
                    todos[idx].markerIdx = idx;
                    markers[idx] = marker;

                    refreshCluster();
                });
            }
        }

        function refreshCluster () {
            var markersList = [];
            for (var key in markers) {
                if(markers[key]) {
                    markersList.push(markers[key]);
                }
            }

            var markerCluster = new MarkerClusterer(map, markersList, {
                maxZoom: 15,
                gridSize: 20
            });
        }

        $scope.editTodo = function (todo) {
            $scope.editingTodo = todo;

            // Clone the original todo to restore it on demand.
            $scope.originalTodo = angular.extend({}, todo);
        };

        $scope.removeTodo = function (todo) {
            var idx = todos.indexOf(todo);
            if(markers[todo.markerIdx]) {
                markers[todo.markerIdx].setMap(null);
                markers[todo.markerIdx] = null;
            }

            refreshCluster();
            todos.splice(idx, 1);
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

        function handleNoGeolocation(errorFlag) {
            if (errorFlag) {
                var content = 'Error: The Geolocation service failed.';
            } else {
                var content = 'Error: Your browser doesn\'t support geolocation.';
            }

            var options = {
                map: map,
                position: new google.maps.LatLng(60, 105),
                content: content
            };

            var infowindow = new google.maps.InfoWindow(options);
            map.setCenter(options.position);
        }

        (function getCurrentLocation () {
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    var pos = new google.maps.LatLng(position.coords.latitude,
                        position.coords.longitude);

                    map.setCenter(pos);
                }, function() {
                    handleNoGeolocation(true);
                });
            } else {
                // Browser doesn't support Geolocation
                handleNoGeolocation(false);
            }
        })();

        (function addMarker () {
            var length = todos.length;
            for(var i=0;i<length;i++) {
                if(todos[i].pos) {
                    var latLng = new google.maps.LatLng(todos[i].pos[0], todos[i].pos[1]);
                    var marker = new google.maps.Marker({
                        position : latLng,
                        map : map,
                        title : todos[i].title
                    });

                    todos[i].markerIdx = i;
                    markers[i] = marker;
                }
            }

            refreshCluster();
        })();

        $scope.onDrop = function($event,$data){
            var temp = todos[$data.dragEleIdx];
            todos[$data.dragEleIdx] = todos[$data.dropEleIdx];
            todos[$data.dropEleIdx] = temp;
            console.log($data);
        };

    }
]);

