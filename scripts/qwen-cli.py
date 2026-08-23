#!/usr/bin/env python3
r"""
Qwen CLI - Command-line interface for Alibaba Qwen models (Qwen 3.8 Max, Qwen-Max, Qwen-Plus, etc.)
Connected with Alibaba Cloud Bailian Token Plan.
Usage:
    .\qwen "คำถามของคุณ"
    .\qwen -m qwen3.8-max "คำถาม"
    .\qwen --chat
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

def load_bailian_credentials():
    config_file = Path.home() / '.bailian' / 'config.json'
    api_key = None
    base_url = "https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
    default_model = "qwen3.8-max"

    if config_file.exists():
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
            active = cfg.get('active_config', 'token-plan')
            profile = cfg.get(active, {})
            api_key = profile.get('api_key')
            raw_base = profile.get('base_url')
            if raw_base:
                if 'compatible-mode' not in raw_base:
                    base_url = f"{raw_base.rstrip('/')}/compatible-mode/v1"
                else:
                    base_url = raw_base
            default_model = profile.get('default_text_model', 'qwen3.8-max')
        except Exception:
            pass

    # Fallback to env variables
    if not api_key:
        api_key = os.getenv("BAILIAN_API_KEY") or os.getenv("DASHSCOPE_API_KEY") or os.getenv("QWEN_API_KEY")
    if os.getenv("BAILIAN_BASE_URL"):
        base_url = os.getenv("BAILIAN_BASE_URL")

    return api_key, base_url, default_model

def get_client():
    api_key, base_url, _ = load_bailian_credentials()
    if not api_key:
        print("\n⚠️ ไม่พบ Token Plan API Key")
        api_key = input("👉 กรุณากรอก API Key: ").strip()
        if not api_key:
            print("❌ ยกเลิกการทำงาน")
            sys.exit(1)

    return OpenAI(api_key=api_key, base_url=base_url)

def normalize_qwen_model(model_name: str = None):
    _, _, default_model = load_bailian_credentials()
    model = (model_name or default_model).lower().strip()
    if model in ['qwen3.8max', 'qwen-3.8-max', '3.8max', '3.8-max', 'qwen3.8', 'qwen-3.8', 'qwen']:
        return 'qwen3.8-max'
    return model

def ask_qwen(prompt: str, model: str = None):
    model = normalize_qwen_model(model)
    client = get_client()

    if console:
        console.print(f"[bold cyan]🤖 Qwen ({model}) กำลังประมวลผล...[/bold cyan]")
    else:
        print(f"🤖 Qwen ({model}) กำลังประมวลผล...")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful expert assistant. You speak clear Thai and English."},
                {"role": "user", "content": prompt}
            ],
        )

        content = response.choices[0].message.content
        if console:
            console.print(Panel(Markdown(content), title=f"[bold green]Qwen Response ({model})[/bold green]", border_style="blue"))
        else:
            print(f"\n--- Qwen ({model}) ---\n{content}\n")
        return content
    except Exception as e:
        if console:
            console.print(f"[bold red]❌ เกิดข้อผิดพลาด:[/bold red] {e}")
        else:
            print(f"❌ เกิดข้อผิดพลาด: {e}")
        return None

def interactive_chat(model: str = None):
    model = normalize_qwen_model(model)
    client = get_client()

    if console:
        console.print(Panel.fit(f"[bold green]✨ เข้าสู่โหมดสนทนา Qwen Interactive Chat ({model})[/bold green]\nพิมพ์ [bold red]'exit'[/bold red] หรือ [bold red]'quit'[/bold red] เพื่อออกจากระบบ", border_style="green"))
    else:
        print(f"✨ เข้าสู่โหมดสนทนา Qwen ({model}) (พิมพ์ 'exit' เพื่อออก)")

    messages = [{"role": "system", "content": "You are a helpful expert assistant. You speak clear Thai and English."}]

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

            reply = response.choices[0].message.content
            messages.append({"role": "assistant", "content": reply})

            if console:
                console.print(Panel(Markdown(reply), title=f"[bold cyan]Qwen ({model})[/bold cyan]", border_style="blue"))
            else:
                print(f"\n🤖 Qwen: {reply}")
        except KeyboardInterrupt:
            print("\n👋 ออกจากระบบเรียบร้อย")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    _, _, default_model = load_bailian_credentials()
    parser = argparse.ArgumentParser(description="Qwen CLI - สั่งการ AI Qwen บน Terminal (Bailian Token Plan)")
    parser.add_argument("prompt", nargs="?", help="ข้อความหรือคำถามที่ต้องการถาม Qwen")
    parser.add_argument("--model", "-m", default=default_model, help=f"ชื่อโมเดล เช่น {default_model}, qwen-max, qwen-plus, qwen2.5-coder-32b-instruct")
    parser.add_argument("--chat", "-c", action="store_true", help="เปิดโหมดสนทนาโต้ตอบ (Interactive Chat)")

    args = parser.parse_args()

    if args.chat or not args.prompt:
        interactive_chat(model=args.model)
    else:
        ask_qwen(args.prompt, model=args.model)

if __name__ == "__main__":
    main()
