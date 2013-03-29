var ActiveMQClient = (function() {

    var ActiveMQURL = 'ws://localhost:61614'; // configurar!!!!

    var client;
    var connectedUsers = {};

    function connect(userName) {

        if(!userName || userName == '') {
            return;
        }

        if (! ('WebSocket' in window || 'MozWebSocket' in window) ) {
            alert('Tu navegador no soporta WebSockets');
            return;
        }

        client = Stomp.client(ActiveMQURL);
        client.connect(null, null, onconnect, onerror);

        function onconnect() {
            console.log("Conectado!!");
            initConnectedUsers();
            subscribeMessageQueue();
            subscribeActiveMQAdvisory();
            setConnected(true);
        }

        function onerror() {
            console.log("Error!!!");
            setConnected(false);
        }

        function initConnectedUsers() {
            connectedUsers = {};
        }

        function subscribeMessageQueue() {
            client.subscribe('chat.' + userName, processMessage);
        }

        function processMessage(message) {
            showConversation(message.headers.from);
            addMessage(message.headers.from, message.body, cleanWhitespaces(message.headers.from) + 'conversation');
        }

        function subscribeActiveMQAdvisory() {
            client.subscribe('/topic/ActiveMQ.Advisory.Consumer.Queue.chat.>', function(msg){
                var jsonObject = JSON.parse(msg.body);
                proccessConsumers(jsonObject);
            });
        }

        function proccessConsumers(msg) {
            if (msg.ConsumerInfo) {
                processConsumerInfo(msg.ConsumerInfo);
            } else if (msg.RemoveInfo) {
                processRemoveInfo(msg.RemoveInfo);
            } else {
                console.log('Mensaje desconocido ' + msg);
            }
        }

        function processConsumerInfo(consumerInfo) {
            var connectionId = consumerInfo.consumerId.connectionId;
            var subscriptionName = consumerInfo.destination[0].replace('chat.', '');
            if (!connectedUsers[connectionId] && subscriptionName != userName) {
                addOnlineUser(subscriptionName);
                connectedUsers[connectionId] = subscriptionName;
            }
        }

        function processRemoveInfo(removeInfo) {
            var connectionId = removeInfo.objectId.connectionId;
            var userName = connectedUsers[connectionId];
            removeOnlineUser(userName);
        }

    }

    function disconnect() {
        if (client) {
            client.disconnect();
        }
        closeAllConversations();
        setConnected(false);
    }

    function setConnected(connected) {
        document.getElementById('connect').disabled = connected;
        document.getElementById('disconnect').disabled = !connected;
        cleanConnectedUsers();
        if (connected) {
            updateUserConnected();
        } else {
            updateUserDisconnected();
        }
    }

    function updateUserConnected() {
        var inputUsername = $('#userName');
        var onLineUserName = $('.onLineUserName');
        onLineUserName.html(inputUsername.val());
        inputUsername.css({display:'none'});
        onLineUserName.css({visibility:'visible'});
        $('#status').html('Conectado');
        $('#status').attr({class : 'connected'});
        $('#onLineUsersPanel').css({visibility:'visible'});
    }

    function updateUserDisconnected() {
        $('.onLineUserName').css({visibility:'hidden'});
        $('#userName').css({display:''});
        $('#status').html('Desconectado');
        $('#status').attr({class : 'disconnected'});
        $('#onLineUsersPanel').css({visibility:'hidden'});
    }

    function cleanConnectedUsers() {
        $('#onlineUsers').html('');
    }

    function removeTab(conversationId) {
        $('#conversations').tabs('remove', conversationId);
    }

    function cleanWhitespaces(text) {
        return text.replace(/\s/g,"_");
    }

    function showConversation(from) {
        var conversations = $('#conversations');
        conversations.css({visibility:'visible'});
        var conversationId = cleanWhitespaces(from) + 'conversation';
        if(document.getElementById(conversationId) == null) {
            createConversationPanel(from);
            conversations.tabs('add', '#' + conversationId, from);
        }
        try {
            conversations.tabs('select', '#' + conversationId);
            $('#'+conversationId+'message').focus();
        } catch (e) {}

    }

    function createConversationPanel(name) {
        var conversationId = cleanWhitespaces(name) + 'conversation';
        var conversationPanel = $(document.createElement('div'));
        conversationPanel.attr({id : conversationId, class : 'conversation'});
        $('<p class="messages"></p><textarea id="' + conversationId + 'message"></textarea>').appendTo(conversationPanel);
        var sendButton = createSendButton(name);
        sendButton.appendTo(conversationPanel);
        var closeButton = createCloseButton(cleanWhitespaces(name));
        closeButton.appendTo(conversationPanel);
        conversationPanel.appendTo($('#conversations'));
    }

    function createSendButton(name) {
        var conversationId = cleanWhitespaces(name) + 'conversation';
        var button = $(document.createElement('button'));
        button.html('Enviar');
        button.click(function () {
            var from = document.getElementById('userName').value;
            var message = document.getElementById(conversationId+'message').value;
            toChat(from, name, message);
            addMessage(from, message, conversationId);
            document.getElementById(conversationId+'message').value = '';
        });
        return button;
    }

    function closeAllConversations() {
        for (var i = $('#conversations').tabs('length'); i >= 0; i--) {
            $('#conversations').tabs('remove', i-1);
        }
        $('#conversations').css({visibility : 'hidden'});
    }

    function createCloseButton(conversationId) {
        var button = $(document.createElement('button'));
        button.html('Cerrar');
        button.click(function () {
            removeTab(conversationId);
        });
        return button;
    }

    function addMessage (from, message, conversationPanelId) {
        var messages = $('#' + conversationPanelId + ' .messages');
        $('<div class="message"><span><b>' + from + '</b> dice:</span><p>' + $('<p/>').text(message).html() + '</p></div>').appendTo(messages);
        messages.scrollTop(messages[0].scrollHeight);
        $('#'+conversationPanelId+' textarea').focus();
    }

    function toChat(sender, receiver, message) {
        client.send('chat.' + receiver, {from: sender}, message);
    }

    /********* usuarios conectados *******/
    function addOnlineUser(userName) {
        var newOnlineUser = createOnlineUser(userName);
        newOnlineUser.appendTo($('#onlineUsers'));
    }

    function removeOnlineUser(userName) {
        $('#onlineUsers > li').each(function (index, elem) {
            if (elem.id == userName + 'onlineuser') {
                $(elem).remove();
            }
        });
    }

    function createOnlineUser(userName) {
        var link = $(document.createElement('a'));
        link.html(userName);
        link.click(function(){
            showConversation(userName);
        });
        var li = $(document.createElement('li'));
        li.attr({id : (userName + 'onlineuser')});
        link.appendTo(li);
        return li;
    }

    window.onbeforeunload = disconnect;

    // metodos publicos
    return {
        connect : connect,
        disconnect : disconnect
    };
})();