#!/usr/bin/env python3
r"""
DeepSeek CLI - Command-line interface for DeepSeek AI models (deepseek-chat, deepseek-reasoner, deepseek-v4-pro)
Usage:
    .\deepseek "คำถามของคุณ"
    .\deepseek -m deepseek-reasoner "คำถามทางตรรกะ/คณิตศาสตร์"
    .\deepseek --chat
"""

import os
import sys
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if available
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

try:
    from openai import OpenAI
except ImportError:
    print("❌ กรุณาติดตั้ง openai: python -m pip install openai")
    sys.exit(1)

try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    console = Console()
except ImportError:
    console = None

def load_deepseek_credentials():
    config_file = Path.home() / '.qwen' / 'settings.json'
    api_key = None
    base_url = "https://api.deepseek.com"
    default_model = "deepseek-chat"

    # Try loading from .qwen/settings.json
    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
            env_vars = cfg.get('env', {})
            api_key = env_vars.get('DEEPSEEK_API_KEY')
        except Exception:
            pass

    # Fallback to env variables
    if not api_key:
        api_key = os.getenv("DEEPSEEK_API_KEY")
    if os.getenv("DEEPSEEK_BASE_URL"):
        base_url = os.getenv("DEEPSEEK_BASE_URL")

    return api_key, base_url, default_model

def get_client():
    api_key, base_url, _ = load_deepseek_credentials()
    if not api_key:
        print("\n⚠️ ไม่พบ DEEPSEEK_API_KEY")
        api_key = input("👉 กรุณากรอก DeepSeek API Key: ").strip()
        if not api_key:
            print("❌ ยกเลิกการทำงาน")
            sys.exit(1)

    return OpenAI(api_key=api_key, base_url=base_url)

def ask_deepseek(prompt: str, model: str = None):
    _, _, default_model = load_deepseek_credentials()
    model = model or default_model
    client = get_client()

    if console:
        console.print(f"[bold cyan]🧠 DeepSeek ({model}) กำลังคิดและประมวลผล...[/bold cyan]")
    else:
        print(f"🧠 DeepSeek ({model}) กำลังประมวลผล...")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are DeepSeek, an advanced AI reasoning and coding assistant. You speak clear Thai and English."},
                {"role": "user", "content": prompt}
            ],
        )

        message = response.choices[0].message
        reasoning = getattr(message, 'reasoning_content', None)
        content = message.content

        if reasoning and console:
            console.print(Panel(Markdown(reasoning), title="[bold yellow]💭 DeepSeek Reasoning (กระบวนการคิด)[/bold yellow]", border_style="yellow"))

        if console:
            console.print(Panel(Markdown(content), title=f"[bold green]DeepSeek Response ({model})[/bold green]", border_style="blue"))
        else:
            if reasoning:
                print(f"\n--- Reasoning ---\n{reasoning}\n")
            print(f"\n--- DeepSeek ({model}) ---\n{content}\n")
        return content
    except Exception as e:
        if console:
            console.print(f"[bold red]❌ เกิดข้อผิดพลาด:[/bold red] {e}")
        else:
            print(f"❌ เกิดข้อผิดพลาด: {e}")
        return None

def interactive_chat(model: str = None):
    _, _, default_model = load_deepseek_credentials()
    model = model or default_model
    client = get_client()

    if console:
        console.print(Panel.fit(f"[bold green]✨ เข้าสู่โหมดสนทนา DeepSeek Interactive Chat ({model})[/bold green]\nพิมพ์ [bold red]'exit'[/bold red] หรือ [bold red]'quit'[/bold red] เพื่อออกจากระบบ", border_style="green"))
    else:
        print(f"✨ เข้าสู่โหมดสนทนา DeepSeek ({model}) (พิมพ์ 'exit' เพื่อออก)")

    messages = [{"role": "system", "content": "You are DeepSeek, a helpful and precise AI assistant. You speak clear Thai and English."}]

    while True:
        try:
            user_input = input("\n👤 คุณ: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit', 'q']:
                print("👋 ลาก่อนครับ!")
                break

            messages.append({"role": "user", "content": user_input})

            response = client.chat.completions.create(
                model=model,
                messages=messages,
            )

            message = response.choices[0].message
            reasoning = getattr(message, 'reasoning_content', None)
            reply = message.content
            messages.append({"role": "assistant", "content": reply})

            if reasoning and console:
                console.print(Panel(Markdown(reasoning), title="[bold yellow]💭 DeepSeek Reasoning[/bold yellow]", border_style="yellow"))

            if console:
                console.print(Panel(Markdown(reply), title=f"[bold cyan]DeepSeek ({model})[/bold cyan]", border_style="blue"))
            else:
                if reasoning:
                    print(f"\n[Reasoning]: {reasoning}")
                print(f"\n🤖 DeepSeek: {reply}")
        except KeyboardInterrupt:
            print("\n👋 ออกจากระบบเรียบร้อย")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    _, _, default_model = load_deepseek_credentials()
    parser = argparse.ArgumentParser(description="DeepSeek CLI - สั่งการ AI DeepSeek บน Terminal")
    parser.add_argument("prompt", nargs="?", help="ข้อความหรือคำถามที่ต้องการถาม DeepSeek")
    parser.add_argument("--model", "-m", default=default_model, help="ชื่อโมเดล เช่น deepseek-chat, deepseek-reasoner, deepseek-v4-pro")
    parser.add_argument("--chat", "-c", action="store_true", help="เปิดโหมดสนทนาโต้ตอบ (Interactive Chat)")

    args = parser.parse_args()

    if args.chat or not args.prompt:
        interactive_chat(model=args.model)
    else:
        ask_deepseek(args.prompt, model=args.model)

if __name__ == "__main__":
    main()
