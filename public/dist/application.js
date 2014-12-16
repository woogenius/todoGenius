'use strict';
// Init the application configuration module for AngularJS application
var ApplicationConfiguration = function () {
    // Init module configuration options
    var applicationModuleName = 'todogenius';
    var applicationModuleVendorDependencies = [
        'ngResource',
        'ui.router',
        'ui.bootstrap',
        'ui.utils'
      ];
    // Add a new vertical module
    var registerModule = function (moduleName, dependencies) {
      // Create angular module
      angular.module(moduleName, dependencies || []);
      // Add the module to the AngularJS configuration file
      angular.module(applicationModuleName).requires.push(moduleName);
    };
    return {
      applicationModuleName: applicationModuleName,
      applicationModuleVendorDependencies: applicationModuleVendorDependencies,
      registerModule: registerModule
    };
  }();'use strict';
//Start by defining the main module and adding the module dependencies
angular.module(ApplicationConfiguration.applicationModuleName, ApplicationConfiguration.applicationModuleVendorDependencies);
// Setting HTML5 Location Mode
angular.module(ApplicationConfiguration.applicationModuleName).config([
  '$locationProvider',
  function ($locationProvider) {
    $locationProvider.hashPrefix('!');
  }
]);
//Then define the init function for starting up the application
angular.element(document).ready(function () {
  //Fixing facebook bug with redirect
  if (window.location.hash === '#_=_')
    window.location.hash = '#!';
  //Then init the app
  angular.bootstrap(document, [ApplicationConfiguration.applicationModuleName]);
});'use strict';
// Use Applicaion configuration module to register a new module
ApplicationConfiguration.registerModule('core');'use strict';
// Use Applicaion configuration module to register a new module
ApplicationConfiguration.registerModule('users');'use strict';
// Setting up route
angular.module('core').config([
  '$stateProvider',
  '$urlRouterProvider',
  function ($stateProvider, $urlRouterProvider) {
    // Redirect to home view when route not found
    $urlRouterProvider.otherwise('/');
    // Home state routing
    $stateProvider.state('home', {
      url: '/',
      templateUrl: 'modules/core/views/home.client.view.html'
    }).state('active', {
      url: '/active',
      templateUrl: 'modules/core/views/home.client.view.html'
    }).state('completed', {
      url: '/completed',
      templateUrl: 'modules/core/views/home.client.view.html'
    });
  }
]);'use strict';
angular.module('core').controller('HeaderController', [
  '$scope',
  'Authentication',
  'Menus',
  function ($scope, Authentication, Menus) {
    $scope.authentication = Authentication;
    $scope.isCollapsed = false;
    $scope.menu = Menus.getMenu('topbar');
    $scope.toggleCollapsibleMenu = function () {
      $scope.isCollapsed = !$scope.isCollapsed;
    };
    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      $scope.isCollapsed = false;
    });
  }
]);'use strict';
angular.module('core').controller('HomeController', [
  '$scope',
  '$location',
  '$filter',
  'Authentication',
  'TodoStorage',
  function ($scope, $location, $filter, Authentication, TodoStorage) {
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
      if (newValue !== oldValue) {
        // This prevents unneeded calls to the local storage
        TodoStorage.put(todos);
      }
    }, true);
    // Monitor the current route for changes and adjust the filter accordingly.
    $scope.$on('$stateChangeSuccess', function () {
      var path = $location.path().split('/');
      var status = $scope.status = path[path.length - 1] || '';
      $scope.statusFilter = status === 'active' ? { completed: false } : status === 'completed' ? { completed: true } : null;
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
      setTodoMarker(todos.length - 1);
      $scope.newTodo = '';
    };
    function setTodoMarker(idx) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          var pos = [
              position.coords.latitude,
              position.coords.longitude
            ];
          todos[idx].pos = pos;
          var latLng = new google.maps.LatLng(pos[0], pos[1]);
          var marker = new google.maps.Marker({
              position: latLng,
              map: map,
              animation: google.maps.Animation.DROP,
              title: todos[idx].title
            });
          todos[idx].markerIdx = idx;
          markers[idx] = marker;
          refreshCluster();
        });
      }
    }
    function refreshCluster() {
      var markersList = [];
      for (var key in markers) {
        if (markers[key]) {
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
      if (markers[todo.markerIdx]) {
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
    (function getCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
          var pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          map.setCenter(pos);
        }, function () {
          handleNoGeolocation(true);
        });
      } else {
        // Browser doesn't support Geolocation
        handleNoGeolocation(false);
      }
    }());
    (function addMarker() {
      var length = todos.length;
      for (var i = 0; i < length; i++) {
        if (todos[i].pos) {
          var latLng = new google.maps.LatLng(todos[i].pos[0], todos[i].pos[1]);
          var marker = new google.maps.Marker({
              position: latLng,
              map: map,
              title: todos[i].title
            });
          todos[i].markerIdx = i;
          markers[i] = marker;
        }
      }
      refreshCluster();
    }());
    $scope.onDrop = function ($event, $data) {
      var temp = todos[$data.dragEleIdx];
      todos[$data.dragEleIdx] = todos[$data.dropEleIdx];
      todos[$data.dropEleIdx] = temp;
      console.log($data);
    };
  }
]);'use strict';
angular.module('core').directive('uiDraggable', [
  '$parse',
  '$rootScope',
  function ($parse, $rootScope) {
    return function (scope, element, attrs) {
      element.attr('draggable', false);
      attrs.$observe('uiDraggable', function () {
        element.attr('draggable', !scope.todo.completed);
      });
      var dragData = '';
      scope.$watch(attrs.drag, function (newValue) {
        dragData = newValue;
      });
      var dummyNode;
      // get index of element
      var idx = scope.todos.indexOf(scope.todo);
      var lastElementOffset;
      element.bind('dragstart', function (e) {
        lastElementOffset = scope.remainingCount * 63 - 2;
        if (scope.todo.completed) {
          e.preventDefault();
          return;
        }
        $rootScope.$broadcast('ANGULAR_DRAG_START', { dragEleIdx: idx });
        // make dummy node for drag animation
        dummyNode = element[0].cloneNode(true);
        var dummycss = 'position : absolute;' + 'top : -58px;' + 'width : ' + element[0].offsetWidth + 'px;' + 'pointer-events : none;' + 'transform : translate3d(0px,' + ((idx + 1) * 63 + e.offsetY - 30) + 'px, 0px);';
        dummyNode.style.cssText = dummycss;
        dummyNode.classList.add('dragging');
        element[0].parentNode.appendChild(dummyNode);
        element[0].style.opacity = 0;
      });
      element.bind('dragend', function (e) {
        dummyNode.remove();
        element[0].style.opacity = 1;
        var sendChannel = attrs.dragChannel || 'defaultchannel';
        $rootScope.$broadcast('ANGULAR_DRAG_END', sendChannel);
      });
      var prevOffset;
      element.bind('drag', function (e) {
        var offsetY = (idx + 1) * 63 + e.offsetY - 30;
        if (offsetY > lastElementOffset) {
          dummyNode.style['transform'] = 'translate3d(0px,' + lastElementOffset + 'px, 0px)';
        } else if (offsetY < 58 && prevOffset < 58) {
          dummyNode.style['transform'] = 'translate3d(0px,' + 58 + 'px, 0px)';
        } else {
          dummyNode.style['transform'] = 'translate3d(0px,' + offsetY + 'px, 0px)';
        }
        if (prevOffset < offsetY) {
          $rootScope.moveup = false;
        } else {
          $rootScope.moveup = true;
        }
        prevOffset = offsetY;
      });
    };
  }
]).directive('uiOnDrop', [
  '$parse',
  '$rootScope',
  function ($parse, $rootScope) {
    return function (scope, element, attr) {
      var dropChannel = 'defaultchannel';
      var dragChannel = '';
      var dragHoverClass = 'todo-hover';
      var moveDownClass = 'todo-movedown';
      var moveUpClass = 'todo-moveup';
      function onDragOver(e) {
        if (e.preventDefault) {
          e.preventDefault();  // Necessary. Allows us to drop.
        }
        if (e.stopPropagation) {
          e.stopPropagation();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
      }
      var dragEleIdx, dropEleIdx;
      if (scope.todo && scope.todo.completed) {
        dropEleIdx = scope.remainingCount - 1;
      } else if (scope.todo) {
        dropEleIdx = scope.todos.indexOf(scope.todo);
      }
      function onDragEnter(e) {
        if (!scope.todo)
          return;
        console.log($rootScope.moveup);
        if ($rootScope.moveup) {
          if (dragEleIdx < dropEleIdx) {
            if (scope.todo.completed)
              return;
            element.addClass(dragHoverClass);
            element.removeClass(moveUpClass);
            $rootScope.dropEleIdx = dropEleIdx;
          } else if (dragEleIdx > dropEleIdx) {
            element.addClass(dragHoverClass);
            element.addClass(moveDownClass);
            $rootScope.dropEleIdx = dropEleIdx;
          } else {
            console.log('drag = drop');
          }
          $rootScope.lastMovement = true;
        } else {
          if (dragEleIdx < dropEleIdx) {
            if (scope.todo.completed)
              return;
            element.addClass(dragHoverClass);
            element.addClass(moveUpClass);
            $rootScope.dropEleIdx = dropEleIdx;
          } else if (dragEleIdx > dropEleIdx) {
            element.addClass(dragHoverClass);
            element.removeClass(moveDownClass);
            $rootScope.dropEleIdx = dropEleIdx;
          } else {
            console.log('drag = drop');
          }
          $rootScope.lastMovement = false;
        }
      }
      function onDrop(e) {
        if (scope.todo)
          return;
        if (e.preventDefault) {
          e.preventDefault();  // Necessary. Allows us to drop.
        }
        if (e.stopPropagation) {
          e.stopPropagation();  // Necessary. Allows us to drop.
        }
        debugger;
        //                    console.log($rootScope.lastMovement);
        //                    if($rootScope.lastMovement) {
        //                        $rootScope.dropEleIdx--;
        //                    }
        var data = {
            dragEleIdx: dragEleIdx,
            dropEleIdx: $rootScope.dropEleIdx
          };
        var fn = $parse(attr.uiOnDrop);
        scope.$apply(function () {
          fn(scope, {
            $data: data,
            $event: e
          });
        });
      }
      $rootScope.$on('ANGULAR_DRAG_START', function (event, data) {
        dragEleIdx = data.dragEleIdx;
        element.bind('dragover', onDragOver);
        element.bind('dragenter', onDragEnter);
        element.bind('drop', onDrop);
      });
      $rootScope.$on('ANGULAR_DRAG_END', function (e, channel) {
        dragChannel = '';
        if (dropChannel === channel) {
          element.unbind('dragover', onDragOver);
          element.unbind('dragenter', onDragEnter);
          element.unbind('drop', onDrop);
          element.removeClass(dragHoverClass);
          element.removeClass(moveUpClass);
          element.removeClass(moveDownClass);
        }
      });
      attr.$observe('dropChannel', function (value) {
        if (value) {
          dropChannel = value;
        }
      });
    };
  }
]);'use strict';
angular.module('core').directive('todoEscape', function () {
  var ESCAPE_KEY = 27;
  return function (scope, elem, attrs) {
    elem.bind('keydown', function (event) {
      if (event.keyCode === ESCAPE_KEY) {
        scope.$apply(attrs.todoEscape);
      }
    });
  };
});'use strict';
angular.module('core').directive('todoFocus', [
  '$timeout',
  function todoFocus($timeout) {
    return function (scope, elem, attrs) {
      scope.$watch(attrs.todoFocus, function (newVal) {
        if (newVal) {
          $timeout(function () {
            elem[0].focus();
          }, 0, false);
        }
      });
    };
  }
]);'use strict';
//Menu service used for managing  menus
angular.module('core').service('Menus', [function () {
    // Define a set of default roles
    this.defaultRoles = ['*'];
    // Define the menus object
    this.menus = {};
    // A private function for rendering decision 
    var shouldRender = function (user) {
      if (user) {
        if (!!~this.roles.indexOf('*')) {
          return true;
        } else {
          for (var userRoleIndex in user.roles) {
            for (var roleIndex in this.roles) {
              if (this.roles[roleIndex] === user.roles[userRoleIndex]) {
                return true;
              }
            }
          }
        }
      } else {
        return this.isPublic;
      }
      return false;
    };
    // Validate menu existance
    this.validateMenuExistance = function (menuId) {
      if (menuId && menuId.length) {
        if (this.menus[menuId]) {
          return true;
        } else {
          throw new Error('Menu does not exists');
        }
      } else {
        throw new Error('MenuId was not provided');
      }
      return false;
    };
    // Get the menu object by menu id
    this.getMenu = function (menuId) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Return the menu object
      return this.menus[menuId];
    };
    // Add new menu object by menu id
    this.addMenu = function (menuId, isPublic, roles) {
      // Create the new menu
      this.menus[menuId] = {
        isPublic: isPublic || false,
        roles: roles || this.defaultRoles,
        items: [],
        shouldRender: shouldRender
      };
      // Return the menu object
      return this.menus[menuId];
    };
    // Remove existing menu object by menu id
    this.removeMenu = function (menuId) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Return the menu object
      delete this.menus[menuId];
    };
    // Add menu item object
    this.addMenuItem = function (menuId, menuItemTitle, menuItemURL, menuItemType, menuItemUIRoute, isPublic, roles, position) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Push new menu item
      this.menus[menuId].items.push({
        title: menuItemTitle,
        link: menuItemURL,
        menuItemType: menuItemType || 'item',
        menuItemClass: menuItemType,
        uiRoute: menuItemUIRoute || '/' + menuItemURL,
        isPublic: isPublic === null || typeof isPublic === 'undefined' ? this.menus[menuId].isPublic : isPublic,
        roles: roles === null || typeof roles === 'undefined' ? this.menus[menuId].roles : roles,
        position: position || 0,
        items: [],
        shouldRender: shouldRender
      });
      // Return the menu object
      return this.menus[menuId];
    };
    // Add submenu item object
    this.addSubMenuItem = function (menuId, rootMenuItemURL, menuItemTitle, menuItemURL, menuItemUIRoute, isPublic, roles, position) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Search for menu item
      for (var itemIndex in this.menus[menuId].items) {
        if (this.menus[menuId].items[itemIndex].link === rootMenuItemURL) {
          // Push new submenu item
          this.menus[menuId].items[itemIndex].items.push({
            title: menuItemTitle,
            link: menuItemURL,
            uiRoute: menuItemUIRoute || '/' + menuItemURL,
            isPublic: isPublic === null || typeof isPublic === 'undefined' ? this.menus[menuId].items[itemIndex].isPublic : isPublic,
            roles: roles === null || typeof roles === 'undefined' ? this.menus[menuId].items[itemIndex].roles : roles,
            position: position || 0,
            shouldRender: shouldRender
          });
        }
      }
      // Return the menu object
      return this.menus[menuId];
    };
    // Remove existing menu object by menu id
    this.removeMenuItem = function (menuId, menuItemURL) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Search for menu item to remove
      for (var itemIndex in this.menus[menuId].items) {
        if (this.menus[menuId].items[itemIndex].link === menuItemURL) {
          this.menus[menuId].items.splice(itemIndex, 1);
        }
      }
      // Return the menu object
      return this.menus[menuId];
    };
    // Remove existing menu object by menu id
    this.removeSubMenuItem = function (menuId, submenuItemURL) {
      // Validate that the menu exists
      this.validateMenuExistance(menuId);
      // Search for menu item to remove
      for (var itemIndex in this.menus[menuId].items) {
        for (var subitemIndex in this.menus[menuId].items[itemIndex].items) {
          if (this.menus[menuId].items[itemIndex].items[subitemIndex].link === submenuItemURL) {
            this.menus[menuId].items[itemIndex].items.splice(subitemIndex, 1);
          }
        }
      }
      // Return the menu object
      return this.menus[menuId];
    };
    //Adding the topbar menu
    this.addMenu('topbar');
  }]);'use strict';
angular.module('core').factory('TodoStorage', [function () {
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
  }]);'use strict';
// Config HTTP Error Handling
angular.module('users').config([
  '$httpProvider',
  function ($httpProvider) {
    // Set the httpProvider "not authorized" interceptor
    $httpProvider.interceptors.push([
      '$q',
      '$location',
      'Authentication',
      function ($q, $location, Authentication) {
        return {
          responseError: function (rejection) {
            switch (rejection.status) {
            case 401:
              // Deauthenticate the global user
              Authentication.user = null;
              // Redirect to signin page
              $location.path('signin');
              break;
            case 403:
              // Add unauthorized behaviour 
              break;
            }
            return $q.reject(rejection);
          }
        };
      }
    ]);
  }
]);'use strict';
// Setting up route
angular.module('users').config([
  '$stateProvider',
  function ($stateProvider) {
    // Users state routing
    $stateProvider.state('profile', {
      url: '/settings/profile',
      templateUrl: 'modules/users/views/settings/edit-profile.client.view.html'
    }).state('password', {
      url: '/settings/password',
      templateUrl: 'modules/users/views/settings/change-password.client.view.html'
    }).state('accounts', {
      url: '/settings/accounts',
      templateUrl: 'modules/users/views/settings/social-accounts.client.view.html'
    }).state('signup', {
      url: '/signup',
      templateUrl: 'modules/users/views/authentication/signup.client.view.html'
    }).state('signin', {
      url: '/signin',
      templateUrl: 'modules/users/views/authentication/signin.client.view.html'
    }).state('forgot', {
      url: '/password/forgot',
      templateUrl: 'modules/users/views/password/forgot-password.client.view.html'
    }).state('reset-invlaid', {
      url: '/password/reset/invalid',
      templateUrl: 'modules/users/views/password/reset-password-invalid.client.view.html'
    }).state('reset-success', {
      url: '/password/reset/success',
      templateUrl: 'modules/users/views/password/reset-password-success.client.view.html'
    }).state('reset', {
      url: '/password/reset/:token',
      templateUrl: 'modules/users/views/password/reset-password.client.view.html'
    });
  }
]);'use strict';
angular.module('users').controller('AuthenticationController', [
  '$scope',
  '$http',
  '$location',
  'Authentication',
  function ($scope, $http, $location, Authentication) {
    $scope.authentication = Authentication;
    // If user is signed in then redirect back home
    if ($scope.authentication.user)
      $location.path('/');
    $scope.signup = function () {
      $http.post('/auth/signup', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;
        // And redirect to the index page
        $location.path('/');
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
    $scope.signin = function () {
      $http.post('/auth/signin', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;
        // And redirect to the index page
        $location.path('/');
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);'use strict';
angular.module('users').controller('PasswordController', [
  '$scope',
  '$stateParams',
  '$http',
  '$location',
  'Authentication',
  function ($scope, $stateParams, $http, $location, Authentication) {
    $scope.authentication = Authentication;
    //If user is signed in then redirect back home
    if ($scope.authentication.user)
      $location.path('/');
    // Submit forgotten password account id
    $scope.askForPasswordReset = function () {
      $scope.success = $scope.error = null;
      $http.post('/auth/forgot', $scope.credentials).success(function (response) {
        // Show user success message and clear form
        $scope.credentials = null;
        $scope.success = response.message;
      }).error(function (response) {
        // Show user error message and clear form
        $scope.credentials = null;
        $scope.error = response.message;
      });
    };
    // Change user password
    $scope.resetUserPassword = function () {
      $scope.success = $scope.error = null;
      $http.post('/auth/reset/' + $stateParams.token, $scope.passwordDetails).success(function (response) {
        // If successful show success message and clear form
        $scope.passwordDetails = null;
        // Attach user profile
        Authentication.user = response;
        // And redirect to the index page
        $location.path('/password/reset/success');
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);'use strict';
angular.module('users').controller('SettingsController', [
  '$scope',
  '$http',
  '$location',
  'Users',
  'Authentication',
  function ($scope, $http, $location, Users, Authentication) {
    $scope.user = Authentication.user;
    // If user is not signed in then redirect back home
    if (!$scope.user)
      $location.path('/');
    // Check if there are additional accounts 
    $scope.hasConnectedAdditionalSocialAccounts = function (provider) {
      for (var i in $scope.user.additionalProvidersData) {
        return true;
      }
      return false;
    };
    // Check if provider is already in use with current user
    $scope.isConnectedSocialAccount = function (provider) {
      return $scope.user.provider === provider || $scope.user.additionalProvidersData && $scope.user.additionalProvidersData[provider];
    };
    // Remove a user social account
    $scope.removeUserSocialAccount = function (provider) {
      $scope.success = $scope.error = null;
      $http.delete('/users/accounts', { params: { provider: provider } }).success(function (response) {
        // If successful show success message and clear form
        $scope.success = true;
        $scope.user = Authentication.user = response;
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
    // Update a user profile
    $scope.updateUserProfile = function (isValid) {
      if (isValid) {
        $scope.success = $scope.error = null;
        var user = new Users($scope.user);
        user.$update(function (response) {
          $scope.success = true;
          Authentication.user = response;
        }, function (response) {
          $scope.error = response.data.message;
        });
      } else {
        $scope.submitted = true;
      }
    };
    // Change user password
    $scope.changeUserPassword = function () {
      $scope.success = $scope.error = null;
      $http.post('/users/password', $scope.passwordDetails).success(function (response) {
        // If successful show success message and clear form
        $scope.success = true;
        $scope.passwordDetails = null;
      }).error(function (response) {
        $scope.error = response.message;
      });
    };
  }
]);'use strict';
// Authentication service for user variables
angular.module('users').factory('Authentication', [function () {
    var _this = this;
    _this._data = { user: window.user };
    return _this._data;
  }]);'use strict';
// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', [
  '$resource',
  function ($resource) {
    return $resource('users', {}, { update: { method: 'PUT' } });
  }
]);