/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle, Wifi, WifiOff } from 'lucide-react';

interface Message {
  id: number;
  message: string;
  sender: string;
  avatar: string | null;
  timestamp: string;
}

interface ChatInterfaceProps {
  helpRequestId: number;
  currentUser: string;
}

export function ChatInterface({ helpRequestId, currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const token = localStorage.getItem('token');
  const socketConnection = useSocket(token);
  const { health, sendMessage, joinRoom } = socketConnection;

  useEffect(() => {
    fetchMessages();
    // Join the help request room for real-time updates
    if (token) {
      joinRoom(`help_request_${helpRequestId}`).catch(console.error);
    }
  }, [helpRequestId, token, joinRoom]);

  useEffect(() => {
    // Use messages from the socket connection if available
    if (socketConnection.messages) {
      const helpRequestMessages = socketConnection.messages.filter(
        msg => msg.type === 'chat' && msg.roomId === `help_request_${helpRequestId}`
      );
      
      if (helpRequestMessages.length > 0) {
        const formattedMessages = helpRequestMessages.map(msg => ({
          id: parseInt(msg.id),
          message: msg.content,
          sender: msg.username,
          avatar: null, // Will be fetched from user data
          timestamp: msg.timestamp
        }));
        
        setMessages(formattedMessages);
      }
    }
  }, [socketConnection.messages, helpRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chat/${helpRequestId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.map((msg: any) => ({
          id: msg.id,
          message: msg.message,
          sender: msg.sender_username,
          avatar: msg.sender_avatar,
          timestamp: msg.created_at
        })));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    
    try {
      // Use the new Pusher-based sendMessage function
      await sendMessage(newMessage.trim(), `help_request_${helpRequestId}`);
      
      // Optimistically add the message to the UI (Pusher will deliver the real message)
      const optimisticMessage: Message = {
        id: Date.now(), // Temporary ID
        message: newMessage.trim(),
        sender: currentUser,
        avatar: null,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      
      // No need to manually refresh - Pusher will deliver the real message
      
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show user-friendly error message
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-600">Loading messages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat
          </div>
          <div className="flex items-center gap-1 text-sm">
            {health.connected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs">Connecting...</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {health.lastError && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ {health.lastError}
          </div>
        )}
        
        {/* Messages */}
        <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.sender === currentUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender !== currentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === currentUser
                      ? 'bg-purple-500 text-white'
                      : 'bg-white border'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === currentUser
                        ? 'text-purple-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                
                {message.sender === currentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.avatar || ''} />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button type="submit" disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Pusher Status */}
        <div className="text-xs text-gray-500 text-center">
          Real-time via Pusher • {health.pusherState}
        </div>
      </CardContent>
    </Card>
  );
}
