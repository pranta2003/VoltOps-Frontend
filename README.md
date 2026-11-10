# VoltOps — Frontend

This is the **frontend** for VoltOps (AI-Powered Electrical Workforce & Service Management Platform).

- **This repository:** Frontend — React + Vite + TypeScript + Tailwind CSS
- **Backend repository:** `<add your backend repo link here once created>` — the backend must be running for features such as login and data access to work.

For the full project plan, milestone roadmap, and feature scope, see `PROJECT_PLAN.md` in this repository. The same file also lives in the backend repository.

---


# 8. GitHub workflow — প্রতিদিন কাজ শুরু করার আগে

এই অংশটি প্রতিদিন কাজ শুরুর আগে পড়বে। কোনো কমান্ড বুঝতে না পারলে অনুমান করে চালাবে না—টিম লিডকে জিজ্ঞেস করবে।

## আমাদের branch-গুলো

- `main` — stable/shared project branch. এখানে সরাসরি push করা যাবে না।
- `pranta` — Pranta-র personal working branch.
- `bani` — Bani-র personal working branch.
- `meshba` — Mesbah-র personal working branch (আগের design brief-এ Limon নামে ছিল).
- `prity` — Prity-র personal working branch.

**নিয়ম:** প্রত্যেকে নিজের নামের branch-এ কাজ করবে। অন্য কারও branch-এ অনুমতি ছাড়া commit বা push করবে না। `main`-এ সরাসরি কাজ করবে না।

## 8.1 প্রথমবার নিজের branch setup

নিচের উদাহরণে `bani` ব্যবহার করা হয়েছে। Pranta হলে `pranta`, Mesbah হলে `meshba`, আর Prity হলে `prity` লিখবে।

```bash
git status
git fetch origin
git switch bani
```

যদি `git switch bani` বলে local branch নেই, তাহলে চালাও:

```bash
git switch --track origin/bani
```

তারপর নিশ্চিত হও যে তুমি সঠিক branch-এ আছ:

```bash
git branch --show-current
```

Output-এ তোমার নিজের branch-এর নাম থাকতে হবে। ভুল branch দেখালে কোনো ফাইল edit বা commit করবে না।

## 8.2 প্রতিদিন কাজ শুরু করার আগে

প্রথমে বর্তমান কাজ নিরাপদ আছে কি না দেখো:

```bash
git status
```

যদি uncommitted changes থাকে, সেগুলো না বুঝে discard, reset বা overwrite করবে না। দরকার হলে আগে commit করো বা টিম লিডের সাহায্য নাও।

তারপর remote-এর সর্বশেষ তথ্য আনো এবং নিজের branch-এ যাও:

```bash
git fetch origin
git switch bani
git log -1 --oneline
git pull --ff-only origin bani
```

- `git log -1 --oneline` সর্বশেষ commit দেখায়।
- `git pull --ff-only origin bani` নিজের remote branch-এর নতুন commit নামায়।
- `--ff-only` conflict হলে Git-কে জোর করে merge commit বানাতে দেয় না। Command ব্যর্থ হলে থামবে এবং সাহায্য চাইবে।

**সতর্কতা:** যদি তোমার branch-এ local uncommitted changes থাকে, আগে সেগুলো নিরাপদ করো। Pull করার আগে `git status` পরিষ্কার থাকা সবচেয়ে সহজ।

## 8.3 কাজ করার সময়

1. নিজের assigned page/feature-এ কাজ করো।
2. অন্য teammate-এর ফাইল edit করার আগে তার সঙ্গে কথা বলো, বিশেষ করে shared `App.tsx`, shared components, route, types, API client বা CSS ফাইল হলে।
3. ছোট ছোট, অর্থপূর্ণ commit করো। কাজের অগ্রগতি নিয়মিত save করো।
4. `.env`, password, API secret, access token বা private key কখনো GitHub-এ push করবে না।
5. কাজ শেষে build/test চালাও:

```bash
npm run build
```

যদি repository-তে test/lint script থাকে, সেগুলোও চালাও।

## 8.4 নিজের branch-এ code push করার নিয়ম

প্রথমে নিশ্চিত হও যে তুমি নিজের branch-এ আছ:

```bash
git branch --show-current
git status
```

যদি `bani` branch-এ থাকো এবং শুধু তোমার intended files stage করতে চাও:

```bash
git add path/to/your-file
git diff --cached
git commit -m "feat: add service request page"
git push origin bani
```

`path/to/your-file`-এর জায়গায় আসল file path লিখবে। একাধিক নির্দিষ্ট file হলে সেগুলো `git add`-এ দিতে পারো। সব পরিবর্তন কার, তা নিশ্চিত না হলে অন্ধভাবে `git add .` চালাবে না।

প্রথমবার local branch remote-এর সঙ্গে যুক্ত না থাকলে:

```bash
git push -u origin bani
```

তারপর থেকে সাধারণত `git push origin bani` ব্যবহার করা যাবে।

**খুব গুরুত্বপূর্ণ:** `bani`-র জায়গায় নিজের branch-এর নাম লিখবে। `git push origin main` চালাবে না। ভুল করে `main`-এ push করার চেষ্টা করলে এবং GitHub protection ঠিকভাবে চালু থাকলে push reject হওয়ার কথা—তবুও ভুল কমান্ড না চালানোই নিয়ম।

## 8.5 Feature শেষ হলে Pull Request (PR) কীভাবে করবে

1. নিজের branch-এ সব intended changes commit ও push করো।
2. GitHub repository খোলো।
3. **Pull requests → New pull request**-এ যাও।
4. `base` হবে `main`; `compare` হবে তোমার branch (`bani`, `pranta`, `meshba` বা `prity`)।
5. Files changed tab-এ diff দেখে নিশ্চিত হও যে অন্যের কাজ, `.env`, অপ্রাসঙ্গিক ফাইল বা অসম্পূর্ণ পরিবর্তন ঢুকে যায়নি।
6. PR title ও description-এ কী বানিয়েছ, কীভাবে test করেছ, কী বাকি আছে—লিখো।
7. CI/build checks pass হওয়া এবং reviewer approval না পাওয়া পর্যন্ত merge করবে না। Merge করার অনুমতি টিম লিডের।
8. PR merge হওয়ার পর তোমার personal branch delete করবে না। এই branch-গুলো team working branch হিসেবে রাখা হবে।
9. Merge-এর পর নিজের branch-এ ফিরে `main`-এর নতুন পরিবর্তন আনতে টিমের নির্ধারিত পদ্ধতি অনুসরণ করো। নিচের safe sequence ব্যবহার করা যায় যদি তোমার working tree clean থাকে:

```bash
git fetch origin
git switch bani
git pull --ff-only origin bani
git merge origin/main
```

যদি merge conflict হয়, আন্দাজ করে file overwrite করবে না। Conflict সমাধানে সাহায্য নাও, তারপর build/test চালিয়ে নিজের branch-এ push করো।

## 8.6 ভুল branch-এ থাকলে কী করবে?

যদি `git branch --show-current` তোমার নিজের branch না দেখায়, কোনো commit বা push করবে না। আগে `git status` দেখো। Uncommitted changes থাকলে সেগুলো নিরাপদ না করে branch switch কোরো না। দরকার হলে টিম লিডকে screenshot বা terminal output পাঠাও।

## 8.7 Team Git rules — অবশ্যই মানতে হবে

- `main`-এ direct push নিষিদ্ধ; PR দিয়ে merge হবে।
- নিজের personal branch-এ push করবে।
- অন্যের branch-এ অনুমতি ছাড়া push করবে না।
- Force push (`git push --force`) চালাবে না।
- `git reset --hard`, `git clean -fd`, `git checkout .` বা `git restore .` চালিয়ে কাজ মুছবে না—টিম লিডের অনুমতি ছাড়া নয়।
- Conflict হলে থামবে; ভুল করে accept-all বা পুরো file overwrite করবে না।
- PR-এ শুধু নিজের feature-এর সম্পর্কিত changes রাখবে।
- `.env` এবং secrets commit/push করবে না।
- PR merge করার আগে build/checks pass করতে হবে।
- কাজ শেষ হলেও `pranta`, `bani`, `meshba`, `prity` personal branch delete করবে না। শুধু অনুমোদিত short-lived feature branch merge হওয়ার পর delete করা যাবে।
