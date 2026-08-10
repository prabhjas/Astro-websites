jQuery(document).ready(function($){const ajaxurl=window.fv_chatbot_vars?.ajaxurl||'/wp-admin/admin-ajax.php';const $container=$('.fv-chatbot-container');const $messages=$('.fv-chatbot-messages');const $input=$('.fv-chatbot-input input');const $sendBtn=$('.fv-chatbot-send');function addMessage(text,isUser=!1){const messageClass=isUser?'fv-chatbot-user':'fv-chatbot-bot';const timestamp=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});$messages.append(`<div class="fv-chatbot-message ${messageClass}">
                <div class="fv-chatbot-message-content">${text}</div>
                <div class="fv-chatbot-message-time">${timestamp}</div>
            </div>`);$messages.scrollTop($messages[0].scrollHeight)}
function showTypingIndicator(){$messages.append(`<div class="fv-chatbot-typing">
                <div class="fv-chatbot-typing-dot"></div>
                <div class="fv-chatbot-typing-dot"></div>
                <div class="fv-chatbot-typing-dot"></div>
            </div>`);$messages.scrollTop($messages[0].scrollHeight)}
function hideTypingIndicator(){$messages.find('.fv-chatbot-typing').remove()}
function sendMessage(){const message=$input.val().trim();if(!message)return;addMessage(message,!0);$input.val('');showTypingIndicator();$.ajax({url:ajaxurl,type:'POST',data:{action:'fv_chatbot_process',message:message},success:function(response){hideTypingIndicator();if(response.success){addMessage(response.data.response)}},error:function(){hideTypingIndicator();addMessage("Sorry, I'm having trouble connecting. Please try again later.")}})}
function handleQuickReply(question){$input.val(question);sendMessage()}
$sendBtn.on('click',sendMessage);$input.on('keypress',function(e){if(e.which===13)sendMessage()});$(document).on('click','.fv-quick-reply',function(){handleQuickReply($(this).text())})})