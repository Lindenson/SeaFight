
//УПРАВЛЕНИЕ СОБСТВЕННЫМИ СУДАМИ


//Размеры таблицы-поля
function getMainTableOffset() {
    return $(".todrag").offset();
}
function getMainTableWidth() {
    return $(".todrag").width();
}
function getMainTableHeight() {
    return $(".todrag").height();
}

//таблица игроков
let gamersList;
let gamersListTable;
let tableInit=true;
let STOMP_subscription;

//машина состояний
let partnerSetUp=false;
let yourStep=false;
let yourPartner="";
let invitedBy="";
let agreedTo="";
let iPlay=false;

//для визуализации
let ifDragged=false;
let savedPos;

//таймаут
const invitationTimeOut = 15000;
let invitationCallback;



//Обработчик драг энд дроп для расстановки собственных судов
function forDrag() {
    let finalOffset;
    let finalxPos;
    let finalyPos;
    let flowxPos;
    let flowyPos;
    let initOffset;

    $(".draggable").draggable({
        start: function (event, ui) {
            initOffset = $(this).offset();
            flowxPos = initOffset.left;
            flowyPos = initOffset.top;
        },
        stop: function (event, ui) {
            finalOffset = $(this).offset();
            finalxPos = finalOffset.left;
            finalyPos = finalOffset.top;
            //Проверяем попали ли в поле игры, перемещая кораблик
            if (checkNotInsideMainTable(finalOffset, $(this).width(), $(this).height())) {
                //Найден ли по положению элемент куда будем помещать кораблик
                let cell=getElsAt(finalyPos, finalxPos);
                if (cell.length!==0) {
                    cellObject.fromId(cell.attr("id"));
                    //Устанавливаем размер корабля
                    let sl=4;
                    if ( $(this).hasClass( "ship1" ) )  sl=1;
                    if ( $(this).hasClass( "ship2" ) )  sl=2;
                    if ( $(this).hasClass( "ship3" ) )  sl=3;
                    //Проверяем не укладываем ли на уже размещенный кoрабль
                    let resulT=Model.validateShip(cellObject.x, cellObject.y, positioN.HOR, sl, 0);
                    if (resulT) {
                        Model.poseShip(cellObject.x, cellObject.y, positioN.HOR, sl, 0);
                        //Удаляем верхний спейсер для нормального смещения корабликов вверх
                        if (($(this).attr("id")!=="ship11")&&($(this).attr("id")!=="ship13")) {$(this).prev().remove();}
                        else {$(this).next().remove();}
                        //Удаляем установленный кoраблик из панели выбора и обновляем вьюв
                        $(this).remove();
                        Model.updateViev();
                        //Глюк в сафари
                        if (is_safari) $('tr').hide().show(0);
                        insertDiv(finalxPos, finalyPos, sl, positioN.HOR);
                        //Если разместили все корабли то отображаем кнопку "Вперед"
                        goFuther++;
                        if (goFuther>10) $('#gofuther').css("visibility", "visible")
                    }
                    else $(this).offset(initOffset);
                }
            } else {$(this).offset(initOffset);}
        }
    });
}



//Обработчик драг энд дроп для переноса расставленных судов
function forDragDiv() {
    let finalOffset;
    let finalxPos;
    let finalyPos;
    let flowxPos;
    let flowyPos;
    let initOffset;
    let cellOld;
    let cellNew;
    let lenGH;
    let oldX;
    let oldY;
    $(".draggable1").draggable({
        start: function (event, ui) {
            ifDragged=true;
            initOffset = $(this).offset();
            flowxPos = initOffset.left;
            flowyPos = initOffset.top;
            $(this).css("border", "solid");
            $(this).css("border-color", "red");
            cellOld=getElsAt(flowyPos, flowxPos);
            if (cellOld.length==0) return;
            cellObject.fromId(cellOld.attr("id"));
            lenGH=Model.getWidth(cellObject.x, cellObject.y);
            oldX=cellObject.x;
            oldY=cellObject.y;
            savedPos=Model.getPos(oldX, oldY);
        },
        stop: function (event, ui) {
            finalOffset = $(this).offset();
            finalxPos = finalOffset.left;
            finalyPos = finalOffset.top;
            cellNew=getElsAt(finalyPos, finalxPos);
            //Найден ли по сетоположению элемент куда будем помещать кораблик
            if ((cellOld.length==0) || (cellNew.length==0)) {
                $(this).offset(initOffset);
                $(this).remove();
                insertDiv(flowxPos, flowyPos, lenGH, savedPos);
                return;
            }
            //Проверяем попали ли в поле игры, перемещая кораблик
            if (checkNotInsideMainTable(finalOffset, $(this).width(), $(this).height())) {
                $(this).css("border", "none");
                cellObject.fromId(cellNew.attr("id"));
                let savedId=Model.getId(oldX, oldY);
                //Проверяем не укладываем ли на уже размещенный карабль
                let resulT=Model.validateShip(cellObject.x, cellObject.y, savedPos, lenGH, savedId);
                if (resulT) {
                    Model.deleteShip(oldX, oldY, lenGH);
                    Model.poseShip(cellObject.x, cellObject.y, savedPos, lenGH, savedId);
                    Model.updateViev();
                    $(this).remove();
                    insertDiv(cellNew.offset().left, cellNew.offset().top, lenGH, savedPos);
                } else {
                    $(this).remove();
                    insertDiv(flowxPos, flowyPos, lenGH, savedPos);
                }
            } else {
                $(this).remove();
                insertDiv(flowxPos, flowyPos, lenGH, savedPos);
            }
        }
    });
}



function forDragNot(){
    $(".draggable").draggable({ disabled: true });
    $(".draggable1").draggable({ disabled: true });
    $(".frameFor").remove();
}



//Найдем попали ли в пределы таблицы-поля
function checkNotInsideMainTable(offset, w, h) {
    let bigOffset=getMainTableOffset();
    if (offset.top<bigOffset.top) return false;
    if (offset.left<bigOffset.left) return false;
    if ((offset.top+h-forDivBoxDela)>(getMainTableHeight()+bigOffset.top)) return false;
    if ((offset.left+w-forDivBoxDela)>(getMainTableWidth()+bigOffset.left)) return false;
    return true;

}



//Найдем попали в центр какой ячейки +/- погрешность
function getElsAt(top, left){
    return $("body").find(".items")
        .filter(function() {
            let centerYBox=$(this).offset().top+forDivBox/2;
            centerXBox=$(this).offset().left+forDivBox/2;
            centerYShip=top+forDivBox/2;
            centerXShip=left+forDivBox/2;
            let deltaY=Math.abs(centerYBox-centerYShip);
            let deltaX=Math.abs(centerXBox-centerXShip);
            return deltaX<forDivBoxDela
                && deltaY<forDivBoxDela;
        });
}



//Вставляет виртуальную рамку, чтобы показать как мы перемещаем расставленные суда
function insertDiv(myX, myY, widTH, myPos) {
    let tagToadd=getElsAt(myY, myX);
    myY=tagToadd.offset().top;
    myX=tagToadd.offset().left;
    let newDiv;
    if (myPos==positioN.HOR) {
            newDiv = "<div class='frameFor draggable1' style='top: "
            + myY + "px; left: "
            + myX + "px; " +
            "width: " + widTH * forDivBox * 1.1
            + "px; height: " +
            forDivBox * 1.1 + "px;'>" + "</div>";
    } else {
            newDiv = "<div class='frameFor draggable1' style='top: "
            + myY + "px; left: "
            + myX + "px; " +
            "height: " + widTH * forDivBox * 1.1
            + "px; width: " +
            forDivBox * 1.1 + "px;'>" + "</div>";
    }
    $("body").append(newDiv);
    forDragDiv();

    //Настраиваем обработчик событий для переворота кораблика
    $(".draggable1").on("mousedown", function () {ifDragged=false;}());
    $(".draggable1").on("mouseup", function (){
        onClickRotate($(this));});
}




//АЯКАСЫ И СОКЕТЫ ДЛЯ РАБОТЫ ПРОГРАММЫ

//СТОМП клиент для получения и отправки


//Отправлям сформированную модель на сервер
function sendJSONtoServer() {
    let toSend='{"shipLines":'+JSON.stringify(Model.ships)+'}';
    sendAJAXpost ("/rest/"+myName()+"/modelBoards", toSend, function (x){},
        function (){goNextStep('play');}, ajaxErrorMessage)
}



//СТОМП для мамы всех страниц


function initMamaSTOMP() {
    //Подписка на все темы
    initSTOMP.callback=function(frame) {
            STOMP_subscription= initSTOMP.client.subscribe("/topic/renewList", handleListOfUsers, {'ack': 'client', 'durable': 'true'});
            initSTOMP.client.subscribe("/topic/invite", handleInvitations, {'ack': 'client', 'durable': 'true'});
            initSTOMP.client.subscribe("/topic/"+myName(), handleInfoExchange, {'ack': 'client', 'durable': 'true'});
            //И первая иницаилизация стартовой таблицы
            drawListGamersTable();
            $("body").css('cursor','default');
            $("#clockWait").remove();
        };

    $("#clockWait").css('visibility', "visible");
    $("body").css('cursor','wait !important; z-index: 999; height: 100%; width: 100%;');


     initSTOMP('ws://'+window.location.host + '/data', '/');

    //Подписались на обмен сообщениями по добавлению и уходу игроков
    let handleListOfUsers = function (incoming) {
        incoming.ack();
        if (iPlay) return;
        if (incoming.body=="playersUpdated") { drawListGamersTable() }
    };

    //Подписались на обмен сообщениями по приглашению
    let handleInvitations = function (incoming) {
        incoming.ack();
        if (iPlay) return;
        if (strStartsWith(incoming.body,myName()+"&invitedNew")) {
            inviteShowDialog(incoming.body);
            return;
        }
        if (strStartsWith(incoming.body,myName()+"&invitedFail")) {
            let otherSide=incoming.body.split("&")[2];
            alertMy('Приглашение к '+otherSide +' отвергнуто!', function () {});
            return;
        }
        if (strStartsWith(incoming.body,myName()+"&invitedDone")) {
            yourPartner=incoming.body.split("&")[2];
            alertMy("Приглашение принято игроком " + yourPartner, function () {});
            goNextStep("prepare");
            return;
        }
        if (strFinishesWith(incoming.body,"invitedDone&"+myName())) {
            yourPartner=incoming.body.split("&")[0];
            goNextStep("prepare");
            return;
        }
        if (strFinishesWith(incoming.body,"invitedFail&"+myName())) {
                let otherSide=incoming.body.split("&")[0];
                if (agreedTo===otherSide) {  //если мы соглашались только что играть
                    agreedTo = "";
                    alertMy('Ваше приглашение от '+otherSide +' более не действует!', function () {});
                }
            return;
        }
    };
}




//Рисование таблицы игроков (с обновлением по добавлению новых)
function drawListGamersTable() {

            let callback=function(newRowsOfData) {
                gamersList=new Array();
                for (let i=0; i<newRowsOfData.length; i++)
                    gamersList[i]=[newRowsOfData[i].name.toString(), newRowsOfData[i].playWith.toString(),
                        newRowsOfData[i].free.toString(), newRowsOfData[i].rating.toString()];
                setDataForTable();
            };

            sendAJAXget("/rest/gamerInfo", callback, function () {}, function () {});

            function setDataForTable() {
                if (tableInit) {
                    tableInit = false;

                    //Используем плаги ДатаТэблс для создания адаптивной таблицы
                    gamersListTable = $("#allGamersTable").DataTable({
                        autoWidth: false,
                        responsive: true,
                        paging: false,
                        scrollCollapse: true,
                        scrollY: '250px',
                        info: false,
                        searching: true,
                        ordering: true,
                        language: {
                            search: "Найти:",
                            zeroRecords: "Не найдено"
                        },
                        columnDefs: [{
                            title: '<i class="bi-person-arms-up"></i>',
                            "render": function (data, type, row) {
                                return '<b style="color: navy">' + data + '</b>';
                            },
                            className: 'dt-body-left',
                            "width": "40%",
                            "targets": 0
                        },
                            {
                                title: '<i class="bi-person-arms-up"></i>',
                                "render": function (data, type, row) {
                                    if (data == "nobody") return '<b style="color: green">...</b>';
                                    return '<b style="color: red">' + data + '</b>';
                                },
                                className: 'dt-body-left',
                                "width": "40%",
                                "targets": 1
                            },
                            {
                                title: '<i class="bi-pin-fill"></i>',
                                "render": function (data, type, row) {
                                    if (data == "true") return '<b style="color: green">Нет</b>';
                                    return '<b style="color: red">Да</b>';
                                },
                                className: 'dt-body-left',
                                "width": "10%",
                                "targets": 2
                            },
                            {
                                title: '<i class="bi-piggy-bank"></i>',
                                "render": function (data, type, row) {
                                    return '<b style="color: navy">' + data + '</b>';
                                },
                                className: 'dt-body-left',
                                "width": "10%",
                                "targets": 3
                            }
                        ],
                    });
                    //Устанавливаем обработчики нажатия ее строк (кроме заголовка)
                    $('#allGamersTable tbody').on('click', 'tr', function() {
                        let row = gamersListTable.row($(this)).data();
                        let nameHis=row[0];
                        let free=row[2];
                        //Сам себе не отправляем приглашение
                        if (nameHis===myName()) return;
                        if(nameHis==="Имя") return;
                        if (free!=='true') return;
                        //Отправляем приглашение
                        alertMy("Отправляем приглашение "+$(this).children(':first').text(), function () {
                            initSTOMP.client.publish({
                                destination: '/app/infoExchange',
                                body: "invite&" + myName() + "&" + nameHis,
                            })
                        });
                    });
                }
                    gamersListTable.clear().rows.add(gamersList).draw();
            }
}





//Выдача диалога при поступлении сообщения о приглашении игрока

function inviteShowDialog(inviter) {
    let names=inviter.split("&");
    let newInviter=names[2];
    //Проверяем не приглашены ли уже (повторно приглашаться допустимо)
    if(invitedBy==='' || invitedBy===newInviter) {

        //ставим таймаут
        invitedBy=newInviter;
        clearTimeout(invitationCallback);
        invitationCallback = clearInviteAfterTimeout();

        $('#modalDialogInvite').find("#modalName").text("Приглашает игрок "+names[2]);
        $('#modalDialogInvite').find("#acceptInviteButton").on('click', function() {

            //Отправляем акцепт приглашения
            unbindAndCloseInviteDialog();
            agreedTo = newInviter;
            let toSend="accepted&"+ newInviter+"&"+myName();
            yourPartner=names[2];
            sendAJAXget("/rest/invitationAccepted/"+toSend, function (x) {},
                function () {}, ajaxErrorMessage);

        });
        $('#modalDialogInvite').find("#rejectInviteButton").on('click', function() {

            //Отправляем режект приглашения
            unbindAndCloseInviteDialog();
            let toSend="rejected&"+ newInviter+"&"+myName();
            sendAJAXget("/rest/invitationAccepted/"+toSend, function (x) {},
                function () { }, ajaxErrorMessage);
        });
        inviteDialog.show();

    } else {
        //Если уже кем то приглашены - отправляем режект приглашения (можно усложнить алгоритм... потом)
        let toSend="rejected&"+ newInviter+"&"+myName();
        sendAJAXget("/rest/invitationAccepted/"+toSend, function (x) {},
            function () {}, ajaxErrorMessage);
    }
}

function unbindAndCloseInviteDialog(){
    invitedBy='';
    clearTimeout(invitationCallback);
    $('#modalDialogInvite').find("#acceptInviteButton").unbind('click');
    $('#modalDialogInvite').find("#rejectInviteButton").unbind('click');
    inviteDialog.hide();
}







// СОБЫТИЯ

//Переход по вебФлоу по событию
function goNextStep(step) {

    let newURL=$('#forFlowPlacer').text()+'&_eventId=';
    switch (step) {
        case "restartGame":
            newURL=newURL+step;
            window.location = newURL;
            break;

        case "prepare":
            //Отписываемся от подписки и начинам игру
            if (STOMP_subscription) STOMP_subscription.unsubscribe();
            iPlay=true;
            //Перерисовываем поле игры
            $('#allGamersTable').empty();
            $('#allGamersTable').remove();
            $('#restartGame').empty();
            $('#restartGame').remove();
            initModel();
            forDrag();
            $('#prepare').css('display', 'inline');
            setPageHeader('Противники готовятся....');
            break;

        case "play":
            //Перерисовываем поле игры
            $('#prepare').empty();
            $('#prepare').remove();
            forDragNot();
            Model.updateViev();
            initFightModel();
            $('#play').css('display', 'inline');
            if (partnerSetUp) setPageHeader('Ходит '+yourPartner+'....');
            else {setPageHeader(yourPartner+' расставляет! Ждем....'); yourStep=true;}
            break;

        case "toExit":
            newURL=newURL+step;
            window.location = newURL;
            break;
    }

}



//Обработка входящих сообщений о ходе игры
let handleInfoExchange = function (incoming) {
    incoming.ack();
    let context=incoming.body.split("&");
    switch (context[0]) {
        case "error":
            alertMy ("Ошибка на сервере! Перегрузитесь", function () {}, true);
            break;
        case "escaped":
            alertMy (context[1], function () {goNextStep("restartGame");}, true);
            break;
        case "setUp":
            if (yourStep) setPageHeader('Ходите Вы....');
            else setPageHeader(yourPartner+' расставил фигуры и ожидает...');
            partnerSetUp=true;
            break;
        case "hitYou":
            hitMe(context[1], context[2], context[3]);
            break;
    }
};






//Устанавливае заголовок (статус игры)
function setPageHeader(input) {
    $("#headerForMessage").text(input);
}


function yourMove() {
    return (partnerSetUp && yourStep);
}


function myName() {
    return $("#forNamePlacer").text();
}


function strStartsWith(str, prefix) {
    return str.indexOf(prefix) === 0;
}

function strFinishesWith(str, prefix) {
    return str.indexOf(prefix) === str.length - prefix.length;
}


function preventMultiEntrance() {
    const alreadyPlaying = $('#forAlreadyPlaying').text();
    if (alreadyPlaying === 'true') {
        alertMy("Вы повторно вошли в игру в том же браузере, из-за этого прошлая " +
            "игра (в другом окне) будет прекращена?", () => goNextStep('toExit'))
    }

}


function clearInviteAfterTimeout() {
    return setTimeout(() => {
        if (!iPlay && invitedBy!=='') {
            let toSend = "rejected&" + invitedBy + "&" + myName();
            sendAJAXget("/rest/invitationAccepted/" + toSend, function (x) {
                },
                function () {
                }, ajaxErrorMessage);
            unbindAndCloseInviteDialog();
        }
    }, invitationTimeOut);
}
