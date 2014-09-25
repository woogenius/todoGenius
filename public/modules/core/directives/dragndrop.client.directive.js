'use strict';

angular.module('core')
    .directive("uiDraggable", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {
            return function (scope, element, attrs) {
                element.attr("draggable", false);
                attrs.$observe("uiDraggable", function () {
                    element.attr("draggable", !scope.todo.completed);
                });
                var dragData = "";
                scope.$watch(attrs.drag, function (newValue) {
                    dragData = newValue;
                });

                var dummyNode;

                // get index of element
                var idx = scope.todos.indexOf(scope.todo);
                var lastElementOffset;

                element.bind("dragstart", function (e) {
                    lastElementOffset = (scope.remainingCount)*63 - 2;
                    if(scope.todo.completed) {
                        e.preventDefault();
                        return;
                    }

                    $rootScope.$broadcast("ANGULAR_DRAG_START", {
                        dragEleIdx: idx
                    });

                    // make dummy node for drag animation
                    dummyNode = element[0].cloneNode(true);
                    var dummycss = "position : absolute;" + "top : -58px;" + "width : " + element[0].offsetWidth + "px;" + "pointer-events : none;" + "transform : translate3d(0px," + ((idx+1)*63 + e.offsetY - 30) + "px, 0px);";
                    dummyNode.style.cssText = dummycss;
                    dummyNode.classList.add("dragging");
                    element[0].parentNode.appendChild(dummyNode);
                    element[0].style.opacity = 0;
                });

                element.bind("dragend", function (e) {
                    dummyNode.remove();
                    element[0].style.opacity = 1;
                    var sendChannel = attrs.dragChannel || "defaultchannel";
                    $rootScope.$broadcast("ANGULAR_DRAG_END", sendChannel);
                });

                var prevOffset;
                element.bind("drag", function (e) {
                    var offsetY = (idx+1)*63 + e.offsetY - 30;

                    if(offsetY > lastElementOffset) {
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
    ])
    .directive("uiOnDrop", [
        '$parse',
        '$rootScope',
        function ($parse, $rootScope) {
            return function (scope, element, attr) {
                var dropChannel = "defaultchannel";
                var dragChannel = "";
                var dragHoverClass = "todo-hover";
                var moveDownClass = "todo-movedown";
                var moveUpClass = "todo-moveup";

                function onDragOver(e) {

                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
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
                    if(!scope.todo) return;
                    console.log($rootScope.moveup);

                    if ($rootScope.moveup) {
                        if (dragEleIdx < dropEleIdx) {
                            if(scope.todo.completed) return;
                            element.addClass(dragHoverClass);
                            element.removeClass(moveUpClass);
                            $rootScope.dropEleIdx = dropEleIdx;
                        } else if (dragEleIdx > dropEleIdx) {
                            element.addClass(dragHoverClass);
                            element.addClass(moveDownClass);
                            $rootScope.dropEleIdx = dropEleIdx;
                        } else {
                            console.log("drag = drop");
                        }
                        $rootScope.lastMovement = true;
                    } else {
                        if (dragEleIdx < dropEleIdx) {
                            if(scope.todo.completed) return;
                            element.addClass(dragHoverClass);
                            element.addClass(moveUpClass);
                            $rootScope.dropEleIdx = dropEleIdx;
                        } else if (dragEleIdx > dropEleIdx) {
                            element.addClass(dragHoverClass);
                            element.removeClass(moveDownClass);
                            $rootScope.dropEleIdx = dropEleIdx;
                        } else {
                            console.log("drag = drop");
                        }
                        $rootScope.lastMovement = false;
                    }
                }

                function onDrop(e) {
                    if(scope.todo) return;
                    if (e.preventDefault) {
                        e.preventDefault(); // Necessary. Allows us to drop.
                    }
                    if (e.stopPropagation) {
                        e.stopPropagation(); // Necessary. Allows us to drop.
                    }


                    debugger;
//                    console.log($rootScope.lastMovement);
//                    if($rootScope.lastMovement) {
//                        $rootScope.dropEleIdx--;
//                    }

                    var data = {
                        dragEleIdx : dragEleIdx,
                        dropEleIdx : $rootScope.dropEleIdx
                    }

                    var fn = $parse(attr.uiOnDrop);
                    scope.$apply(function () {
                        fn(scope, {$data: data, $event: e});
                    });
                }



                $rootScope.$on("ANGULAR_DRAG_START", function (event, data) {
                    dragEleIdx = data.dragEleIdx;

                    element.bind("dragover", onDragOver);
                    element.bind("dragenter", onDragEnter);

                    element.bind("drop", onDrop);
                });

                $rootScope.$on("ANGULAR_DRAG_END", function (e, channel) {
                    dragChannel = "";
                    if (dropChannel === channel) {

                        element.unbind("dragover", onDragOver);
                        element.unbind("dragenter", onDragEnter);

                        element.unbind("drop", onDrop);
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
    ]);
