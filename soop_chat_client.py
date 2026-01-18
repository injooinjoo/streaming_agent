#!/usr/bin/env python3
"""
SOOP (숲) 라이브 채팅 WebSocket 클라이언트
maro5397/soop 레포지토리 참고하여 작성

사용법:
    python soop_chat_client.py <스트리머ID>
    예: python soop_chat_client.py khm11903
"""

import asyncio
import ssl
import json
import requests
import websockets
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional, Dict, Any
from datetime import datetime


class ChatDelimiter:
    """채팅 패킷 구분자"""
    STARTER = "\x1b\t"      # ESC + TAB
    SEPARATOR = "\x0c"       # Form Feed
    ELEMENT_START = "\x11"   # Device Control 1
    ELEMENT_END = "\x12"     # Device Control 2
    SPACE = "\x06"           # ACK


class ChatType:
    """채팅 메시지 타입"""
    PING = "0000"
    CONNECT = "0001"
    ENTER_CHAT_ROOM = "0002"
    EXIT = "0004"
    CHAT = "0005"
    DISCONNECT = "0007"
    ENTER_INFO = "0012"
    TEXT_DONATION = "0018"
    AD_BALLOON_DONATION = "0087"
    SUBSCRIBE = "0093"
    NOTIFICATION = "0104"
    EMOTICON = "0109"
    VIDEO_DONATION = "0105"
    VIEWER = "0127"


@dataclass
class LiveDetail:
    """방송 상세 정보"""
    result: int
    chat_domain: str
    chat_port: int
    chat_no: str
    bj_id: str
    bj_nick: str
    title: str
    ftk: str
    bps: int
    geo_cc: str
    geo_rc: str
    acpt_lang: str
    svc_lang: str
    view_preset: list


class SoopChatEvent:
    """채팅 이벤트 타입"""
    RAW = "raw"
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    ENTER_CHAT_ROOM = "enter_chat_room"
    CHAT = "chat"
    NOTIFICATION = "notification"
    TEXT_DONATION = "text_donation"
    VIDEO_DONATION = "video_donation"
    AD_BALLOON_DONATION = "ad_balloon_donation"
    SUBSCRIBE = "subscribe"
    EMOTICON = "emoticon"
    VIEWER = "viewer"
    EXIT = "exit"
    UNKNOWN = "unknown"


class SoopChatClient:
    """SOOP 채팅 WebSocket 클라이언트"""
    
    def __init__(self, streamer_id: str):
        self.streamer_id = streamer_id
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.live_detail: Optional[LiveDetail] = None
        self.handlers: Dict[str, list] = {}
        self._connected = False
        self._entered = False
        self._ping_task: Optional[asyncio.Task] = None
    
    async def connect(self):
        """채팅 서버에 연결"""
        if self._connected:
            raise Exception("Already connected")
        
        # 방송 정보 가져오기
        self.live_detail = await self._get_live_detail()
        
        if self.live_detail.result == 0:
            raise Exception("방송 중이 아닙니다")
        
        # WebSocket URL 생성
        chat_url = self._make_chat_url()
        print(f"[연결] {chat_url}")
        
        # SSL 컨텍스트 생성 (인증서 검증 비활성화)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        # WebSocket 연결
        self.ws = await websockets.connect(
            chat_url,
            subprotocols=["chat"],
            ssl=ssl_context
        )
        
        # CONNECT 패킷 전송
        connect_packet = self._get_connect_packet()
        await self.ws.send(connect_packet)
        
        # 메시지 수신 시작
        self._ping_task = asyncio.create_task(self._ping_loop())
        
        # 메시지 핸들링
        try:
            async for message in self.ws:
                await self._handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            await self.disconnect()
    
    async def disconnect(self):
        """연결 종료"""
        if not self._connected:
            return
        
        self._emit(SoopChatEvent.DISCONNECT, {
            "streamer_id": self.streamer_id,
            "time": datetime.now().isoformat()
        })
        
        if self._ping_task:
            self._ping_task.cancel()
            self._ping_task = None
        
        if self.ws:
            await self.ws.close()
            self.ws = None
        
        self._connected = False
    
    def on(self, event: str, handler: Callable):
        """이벤트 핸들러 등록"""
        if event not in self.handlers:
            self.handlers[event] = []
        self.handlers[event].append(handler)
    
    def _emit(self, event: str, data: Any):
        """이벤트 발생"""
        if event in self.handlers:
            for handler in self.handlers[event]:
                handler(data)
    
    async def _get_live_detail(self) -> LiveDetail:
        """방송 상세 정보 가져오기"""
        url = f"https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid={self.streamer_id}"
        
        data = {
            "bid": self.streamer_id,
            "bno": "",
            "type": "live",
            "confirm_adult": "false",
            "player_type": "html5",
            "mode": "landing",
            "from_api": "0",
            "pwd": "",
            "stream_type": "common",
            "quality": "HD"
        }
        
        response = requests.post(url, data=data)
        result = response.json()
        
        channel = result.get("CHANNEL", {})
        
        return LiveDetail(
            result=channel.get("RESULT", 0),
            chat_domain=channel.get("CHDOMAIN", ""),
            chat_port=int(channel.get("CHPT", 0)),
            chat_no=str(channel.get("CHATNO", "")),
            bj_id=channel.get("BJID", ""),
            bj_nick=channel.get("BJNICK", ""),
            title=channel.get("TITLE", ""),
            ftk=channel.get("FTK", ""),
            bps=int(channel.get("BPS", 0)),
            geo_cc=channel.get("geo_cc", ""),
            geo_rc=channel.get("geo_rc", ""),
            acpt_lang=channel.get("acpt_lang", ""),
            svc_lang=channel.get("svc_lang", ""),
            view_preset=channel.get("VIEWPRESET", [])
        )
    
    def _make_chat_url(self) -> str:
        """WebSocket URL 생성"""
        domain = self.live_detail.chat_domain.lower()
        port = self.live_detail.chat_port + 1  # 포트 +1
        return f"wss://{domain}:{port}/Websocket/{self.streamer_id}"
    
    def _get_byte_size(self, text: str) -> int:
        """문자열의 바이트 크기"""
        return len(text.encode('utf-8'))
    
    def _get_payload_length(self, payload: str) -> str:
        """페이로드 길이 (6자리)"""
        return str(self._get_byte_size(payload)).zfill(6)
    
    def _get_packet(self, chat_type: str, payload: str) -> str:
        """패킷 생성"""
        header = f"{ChatDelimiter.STARTER}{chat_type}{self._get_payload_length(payload)}00"
        return header + payload
    
    def _get_connect_packet(self) -> str:
        """CONNECT 패킷 생성"""
        payload = f"{ChatDelimiter.SEPARATOR * 3}16{ChatDelimiter.SEPARATOR}"
        return self._get_packet(ChatType.CONNECT, payload)
    
    def _get_join_packet(self) -> str:
        """JOIN 패킷 생성"""
        payload = f"{ChatDelimiter.SEPARATOR}{self.live_detail.chat_no}"
        payload += ChatDelimiter.SEPARATOR * 5
        return self._get_packet(ChatType.ENTER_CHAT_ROOM, payload)
    
    def _get_ping_packet(self) -> str:
        """PING 패킷 생성"""
        return self._get_packet(ChatType.PING, ChatDelimiter.SEPARATOR)
    
    async def _ping_loop(self):
        """60초마다 PING 전송"""
        while True:
            await asyncio.sleep(60)
            if self.ws:
                try:
                    await self.ws.send(self._get_ping_packet())
                except:
                    break
    
    def _parse_message_type(self, packet: str) -> str:
        """메시지 타입 파싱"""
        if not packet.startswith(ChatDelimiter.STARTER):
            raise Exception("Invalid packet: does not start with STARTER")
        if len(packet) >= 5:
            return packet[2:6]
        raise Exception("Invalid packet: too short")
    
    def _parse_connect(self, packet: str) -> dict:
        """CONNECT 응답 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {"username": parts[1] if len(parts) > 1 else "", "syn": parts[2] if len(parts) > 2 else ""}
    
    def _parse_enter_chat_room(self, packet: str) -> dict:
        """ENTER_CHAT_ROOM 응답 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {
            "streamer_id": parts[2] if len(parts) > 2 else "",
            "syn_ack": parts[7] if len(parts) > 7 else ""
        }
    
    def _parse_chat(self, packet: str) -> dict:
        """채팅 메시지 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {
            "comment": parts[1] if len(parts) > 1 else "",
            "user_id": parts[2] if len(parts) > 2 else "",
            "username": parts[6] if len(parts) > 6 else ""
        }
    
    def _parse_notification(self, packet: str) -> dict:
        """알림 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {"notification": parts[4] if len(parts) > 4 else ""}
    
    def _parse_donation(self, packet: str) -> dict:
        """후원 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {
            "to": parts[2] if len(parts) > 2 else "",
            "from": parts[3] if len(parts) > 3 else "",
            "from_username": parts[4] if len(parts) > 4 else "",
            "amount": parts[5] if len(parts) > 5 else ""
        }
    
    def _parse_emoticon(self, packet: str) -> dict:
        """이모티콘 파싱"""
        parts = packet.split(ChatDelimiter.SEPARATOR)
        return {
            "emoticon_id": parts[3] if len(parts) > 3 else "",
            "user_id": parts[6] if len(parts) > 6 else "",
            "username": parts[7] if len(parts) > 7 else ""
        }
    
    async def _handle_message(self, data):
        """메시지 핸들링"""
        received_time = datetime.now().isoformat()
        packet = data if isinstance(data, str) else data.decode('utf-8')
        
        self._emit(SoopChatEvent.RAW, packet)
        
        try:
            msg_type = self._parse_message_type(packet)
        except Exception as e:
            print(f"[에러] 패킷 파싱 실패: {e}")
            return
        
        if msg_type == ChatType.CONNECT:
            self._connected = True
            connect_data = self._parse_connect(packet)
            self._emit(SoopChatEvent.CONNECT, {
                **connect_data,
                "streamer_id": self.streamer_id,
                "time": received_time
            })
            
            # JOIN 패킷 전송
            join_packet = self._get_join_packet()
            await self.ws.send(join_packet)
        
        elif msg_type == ChatType.ENTER_CHAT_ROOM:
            enter_data = self._parse_enter_chat_room(packet)
            self._emit(SoopChatEvent.ENTER_CHAT_ROOM, {
                **enter_data,
                "time": received_time
            })
            self._entered = True
            print(f"[입장] 채팅방 입장 완료")
        
        elif msg_type == ChatType.CHAT:
            chat_data = self._parse_chat(packet)
            self._emit(SoopChatEvent.CHAT, {
                **chat_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.NOTIFICATION:
            notif_data = self._parse_notification(packet)
            self._emit(SoopChatEvent.NOTIFICATION, {
                **notif_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.TEXT_DONATION:
            donation_data = self._parse_donation(packet)
            self._emit(SoopChatEvent.TEXT_DONATION, {
                **donation_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.VIDEO_DONATION:
            donation_data = self._parse_donation(packet)
            self._emit(SoopChatEvent.VIDEO_DONATION, {
                **donation_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.AD_BALLOON_DONATION:
            donation_data = self._parse_donation(packet)
            self._emit(SoopChatEvent.AD_BALLOON_DONATION, {
                **donation_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.EMOTICON:
            emoticon_data = self._parse_emoticon(packet)
            self._emit(SoopChatEvent.EMOTICON, {
                **emoticon_data,
                "time": received_time
            })
        
        elif msg_type == ChatType.DISCONNECT:
            await self.disconnect()
        
        else:
            parts = packet.split(ChatDelimiter.SEPARATOR)
            self._emit(SoopChatEvent.UNKNOWN, {
                "type": msg_type,
                "parts": parts,
                "time": received_time
            })


async def main():
    import sys
    
    if len(sys.argv) < 2:
        print("사용법: python soop_chat_client.py <스트리머ID>")
        print("예: python soop_chat_client.py khm11903")
        return
    
    streamer_id = sys.argv[1]
    
    print(f"=" * 60)
    print(f"SOOP 채팅 클라이언트")
    print(f"스트리머: {streamer_id}")
    print(f"=" * 60)
    
    client = SoopChatClient(streamer_id)
    
    # 이벤트 핸들러 등록
    def on_connect(data):
        print(f"[연결] 채팅 서버 연결됨 - {data}")
    
    def on_chat(data):
        username = data.get("username", "???")
        comment = data.get("comment", "")
        print(f"[채팅] {username}: {comment}")
    
    def on_donation(data):
        from_user = data.get("from_username", "???")
        amount = data.get("amount", "?")
        print(f"[후원] {from_user}님이 {amount}개 후원!")
    
    def on_notification(data):
        notif = data.get("notification", "")
        print(f"[알림] {notif}")
    
    def on_disconnect(data):
        print(f"[연결종료] {data}")
    
    client.on(SoopChatEvent.CONNECT, on_connect)
    client.on(SoopChatEvent.CHAT, on_chat)
    client.on(SoopChatEvent.TEXT_DONATION, on_donation)
    client.on(SoopChatEvent.VIDEO_DONATION, on_donation)
    client.on(SoopChatEvent.AD_BALLOON_DONATION, on_donation)
    client.on(SoopChatEvent.NOTIFICATION, on_notification)
    client.on(SoopChatEvent.DISCONNECT, on_disconnect)
    
    try:
        await client.connect()
    except KeyboardInterrupt:
        print("\n[종료] 사용자에 의해 종료됨")
        await client.disconnect()
    except Exception as e:
        print(f"[에러] {e}")


if __name__ == "__main__":
    asyncio.run(main())
