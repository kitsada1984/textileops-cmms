#!/usr/bin/env python3
"""
Qwen CLI - Command-line interface for Alibaba Qwen models (Qwen-2.5-Max, Qwen-2.5-Coder, Qwen-Plus, etc.)
Usage:
    python scripts/qwen-cli.py "คำถามของคุณ"
    python scripts/qwen-cli.py --model qwen-max "คำถาม"
    python scripts/qwen-cli.py --chat  (Interactive chat mode)
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if available
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

try:
    import dashscope
    from dashscope import Generation
except ImportError:
    print("❌ กรุณาติดตั้ง DashScope: python -m pip install dashscope")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    console = Console()
except ImportError:
    console = None

def get_api_key():
    api_key = os.getenv("DASHSCOPE_API_KEY") or os.getenv("QWEN_API_KEY")
    if not api_key:
        print("\n⚠️ ไม่พบ DASHSCOPE_API_KEY ใน Environment หรือ .env")
        api_key = input("👉 กรุณากรอก DashScope API Key: ").strip()
        if api_key:
            dashscope.api_key = api_key
        else:
            print("❌ ต้องใช้ API Key ในการเรียกใช้งาน Qwen")
            sys.exit(1)
    else:
        dashscope.api_key = api_key
    return api_key

def ask_qwen(prompt: str, model: str = "qwen-max"):
    get_api_key()
    
    if console:
        console.print(f"[bold cyan]🤖 Qwen ({model}) กำลังประมวลผล...[/bold cyan]")
    else:
        print(f"🤖 Qwen ({model}) กำลังประมวลผล...")

    try:
        response = Generation.call(
            model=model,
            prompt=prompt,
            result_format='message'
        )

        if response.status_code == 200:
            content = response.output.choices[0].message.content
            if console:
                console.print(Panel(Markdown(content), title=f"[bold green]Qwen Response ({model})[/bold green]", border_style="blue"))
            else:
                print(f"\n--- Qwen ({model}) ---\n{content}\n")
            return content
        else:
            err_msg = f"HTTP {response.code}: {response.message}"
            if console:
                console.print(f"[bold red]❌ Error:[/bold red] {err_msg}")
            else:
                print(f"❌ Error: {err_msg}")
            return None
    except Exception as e:
        if console:
            console.print(f"[bold red]❌ เกิดข้อผิดพลาด:[/bold red] {e}")
        else:
            print(f"❌ เกิดข้อผิดพลาด: {e}")
        return None

def interactive_chat(model: str = "qwen-max"):
    get_api_key()
    if console:
        console.print(Panel.fit(f"[bold green]✨ เข้าสู่โหมดสนทนา Qwen Interactive Chat ({model})[/bold green]\nพิมพ์ [bold red]'exit'[/bold red] หรือ [bold red]'quit'[/bold red] เพื่อออกจากระบบ", border_style="green"))
    else:
        print(f"✨ เข้าสู่โหมดสนทนา Qwen ({model}) (พิมพ์ 'exit' เพื่อออก)")

    messages = [{'role': 'system', 'content': 'You are a helpful AI assistant.'}]

    while True:
        try:
            user_input = input("\n👤 คุณ: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("👋 ลาก่อนครับ!")
                break

            messages.append({'role': 'user', 'content': user_input})

            response = Generation.call(
                model=model,
                messages=messages,
                result_format='message'
            )

            if response.status_code == 200:
                reply = response.output.choices[0].message.content
                messages.append({'role': 'assistant', 'content': reply})
                if console:
                    console.print(Panel(Markdown(reply), title=f"[bold cyan]Qwen ({model})[/bold cyan]", border_style="blue"))
                else:
                    print(f"\n🤖 Qwen: {reply}")
            else:
                print(f"❌ Error: {response.message}")
        except KeyboardInterrupt:
            print("\n👋 ออกจากระบบเรียบร้อย")
            break

def main():
    parser = argparse.ArgumentParser(description="Qwen CLI - สั่งการ AI Qwen บน Terminal")
    parser.add_argument("prompt", nargs="?", help="ข้อความหรือคำถามที่ต้องการถาม Qwen")
    parser.add_argument("--model", "-m", default="qwen-max", help="ชื่อโมเดล เช่น qwen-max, qwen-plus, qwen-turbo, qwen2.5-coder-32b-instruct")
    parser.add_argument("--chat", "-c", action="store_true", help="เปิดโหมดสนทนาโต้ตอบ (Interactive Chat)")

    args = parser.parse_args()

    if args.chat or not args.prompt:
        interactive_chat(model=args.model)
    else:
        ask_qwen(args.prompt, model=args.model)

if __name__ == "__main__":
    main()
