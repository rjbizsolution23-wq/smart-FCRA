# 🚀 API INTEGRATION MASTER — QUICK START GUIDE

## What Is This?

This is a complete, portable export of the **API Integration Master** AI agent — an elite autonomous system for API orchestration, authentication, and integration. It includes the **Brain Refresh Protocol** for always-current, verified recommendations.

---

## 📦 Package Contents

| File | Purpose |
|------|---------|
| `AGENT_CONFIG.md` | Full metadata, deployment guides for all platforms |
| `SYSTEM_PROMPT.txt` | Raw system prompt — copy/paste ready |
| `SLASH_COMMANDS.md` | Quick reference for all commands |
| `BRAIN_REFRESH_PROTOCOL.md` | Complete protocol documentation |
| `README.md` | This file — quick start guide |

---

## ⚡ 60-Second Setup

### Option 1: OpenAI Custom GPT
1. Go to [chat.openai.com/gpts/editor](https://chat.openai.com/gpts/editor)
2. Create new GPT
3. Paste contents of `SYSTEM_PROMPT.txt` into Instructions
4. Enable: ✅ Web Browsing, ✅ Code Interpreter
5. Done!

### Option 2: Claude Projects
1. Go to [claude.ai/projects](https://claude.ai/projects)
2. Create new project
3. Paste `SYSTEM_PROMPT.txt` into Project Instructions
4. Done!

### Option 3: Cursor IDE
1. Create `.cursorrules` in your project root
2. Paste contents of `SYSTEM_PROMPT.txt`
3. Done!

### Option 4: Any LLM API
```python
import openai

with open("SYSTEM_PROMPT.txt") as f:
    system_prompt = f.read()

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Help me integrate Stripe with my app"}
    ]
)
```

---

## 🎯 Key Features

✅ **Universal API Mastery** — REST, GraphQL, gRPC, WebSockets, SOAP  
✅ **Authentication Expert** — OAuth 2.0, JWT, API keys, SAML  
✅ **Brain Refresh Protocol** — Never stale, always verified  
✅ **Supply Chain Security** — Catches package attacks  
✅ **Confidence Scoring** — 🟢/🟡/🔴 for all recommendations  

---

## 💬 Example Prompts

- "Help me connect Stripe payments to my CRM"
- "Set up OAuth 2.0 with refresh tokens for my app"
- "Build a webhook system for GitHub events"
- "Create a data pipeline from Salesforce to my database"
- "Debug why my API authentication keeps failing"

---

## 🔧 Slash Commands

| Command | What It Does |
|---------|--------------|
| `/refresh-brain` | Full knowledge refresh |
| `/pkg-check [name]` | Verify package safety |
| `/cve-check` | Check security alerts |
| `/verify [claim]` | Fact-check something |

See `SLASH_COMMANDS.md` for the complete list.

---

## 📞 Support

**Created by:** Rick Jefferson | RJ Business Solutions  
**Agent ID:** d736721a-c4fd-479b-89a3-8bc55cf46d58  
**Version:** 2.0  

---

*"Memory is suspect. Live search is law."* 🔥
