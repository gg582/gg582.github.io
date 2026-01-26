---
layout: knowledge-base
title: "Personal Software From AI Sketch to Usable Software"
date: 2026-01-26 12:00:00 +0900
categories: [devnote]
taxonomy:
  category: devnote
  subcategory: general
  order: 1
difficulty: easy
keywords:
  - AI Coding
  - Software Development
  - Personal Project
---

## Is AI Coding bad for you?

In many cases, AI Coding is not beneficial to you, if you don't try to read your code and just abandon what you've done.
If you are struggling with a language that you don't know, there will be no way to manually debug, and reproduce what bugs are happening.

I'll introduce two opposite tasks: SSH-Chatter, and Chatter-Web.

## SSH-Chatter

SSH-Chatter is a modern BBS written in C23, with AI Copilot.
I completed this project just within 6 months with AI, but there were more than just prompting.
AI produces many C codes that cause memory leaks, double free, null pointer dereference, and so on.

In these cases, a developer faces three choices depending on what actually happened to the project.

## Chatter Web

Chatter web was a front-end application for SSH-Chatter written in JavaScript.
At first, I was planning to release Qt frontend of my bulletin board(which was quite successful).
But it is hard to 'persuade' people to install the application, I planned to switch a board to the website.

There were problems while I try this project, which eventually led me to abandon this.

Here are the reasons why I quit this project.
- I am not good at Front-end development
- I don't know anything about xterm.js
- It was hard to accurately handle TCP echo back with Node.js
  - And I am not good at JavaScript when compared to my ability to program in C/C++.

## How to refactor bugs with AI coding tools?
In many cases, people use AI copilots/coding tools to find, and resolve bugs on their software; but it doesn't work well for machine-friendly languages like C, C++, Rust, Zig.
But this doesn't mean there are no benefits when developing with machine-friendly languages.
When you develop with those sorts of languages, you should notice which tools are available.
In my case, when I develop in C, I use valgrind to check memory leaks.
Then when I give a prompt to an AI copilot, it is natural to notice that valgrind is available on my system.

*(here I use "machine-friendly" to mean high-level languages that still
expose the machine model directly, such as C, Rust, and Zig)*

Also, you should plan what to do after noticing what kinds of bugs are in your source code.

### Case 1. Typical bugs

This kind of bug is easy to solve with AI. If a developer tells to AI that it can debug a program with `valgrind`(or provides log.txt to solve), AI will scan many codes and point where was the problem.
If the program is okay with this step, you can go on.

### Case 2. AI's solution is too complex

Sometimes, AI does not delete the problem; it overwrites problematic actions by other safe codes.
When you fall into this step, you must check where is the location that produces certain amounts of bugs, and tackle down each problem while scrolling down a hierarchy.

This is a demo problem that can be easily caused by AI copilots.

```c
int func1(char r, char *msg) {
    // Point 1: No Null check
    msg[0] ^= r;
 
}
 
int func2(char *msg) {
    // do_some_tasks
    free(msg);
    return 0;
 
}
    
int func3(char *msg) {
    // do_some_tasks
    func2(msg);
    // do_some_tasks
    
    // Point 2: msg is Null!
    func1((char) 233, msg);
    // Point 3: double free
    free(msg);
```

At first, valgrind will detect func3's Null pointer dereference.
Then you shall remove `Point 2` to solve the problem.
Now, this is the problem: 'Point 1 and Point 3'.
When you just remove `Point 1` and `Point 3` without following a context, msg is never freed on your program.
So what you need to trace is a context:

- func3 is called by another function
  - read a bug `null pointer dereference` on line xx
    - check `free`
  - trace a function or a macro on line xx
    - check `free`
  - trace a function before line xx
    - check `free`
  - check `free` on current function
- draw a sequential context
- specify when is the end of your variable's lifecycle
- check and remove duplicate `free` calls that do not fit in the variable’s lifecycle


## How to code a prompt

Many people would not agree that `prompting is similar to traditional context/structure engineering`.
However, AI definitely needs `what is specifically required` to make a code that you would expect.
In other words, **DO NOT ORDER A CODE THAT YOU WILL NEVER IMAGINE**.

### Good Prompting

```text
You are a junior engineer at low-level software development.
You are developming a minimal text editor without LSP/Treesitter that is expected to run inside of Docker/LXC.
You must develop a simple bracket parser with a simple rule:
- When Opening brace, indent next line.
- When Closing brace, deindent next line.
- Do not touch closed brackets.

You may match each braces using a stack in this order:
    - Push an opening brace
    - Pop after reading closing brace

You must not attach external LSP/Treesitter to implement this feature, since it must be portable on a specific environment such as `musl-based container OS'.
Add a comment on each step and make a documentation about functions at docs as a form of Markdown.
```

This prompt shows 'what to implement' in English, which is preferable for AI prompting.
Also, this feature does not require destructive action when coding, the prompt should not declare a copilot as a senior engineer.
If you are trying to handle special types of environment which does not use standard glibc, you should tell what is actually used while clarifying keywords like `musl`.


### Bad Prompting

```text
Implement a bracket parser for this editor. This MUST be okay with docker compose.
```


This does not show what is required for which container's compatibility.
AI copilot would imply that the target container image is ubuntu/xx.xx format(which uses glibc), as a result the output may not work in a good manner when compiled using musl target.
Also, there is no steps to teach 'how to write'.
This means you cannot expect AI copilot's result.

## What is sustainable structure?

Unlike famous open source projects, your own projects are prone to specification changes, library version up, and numerous external pressure when continuing it.
If it is a personal software and you cannot handle massive changes, you should *keep it simple*.

I keep these concepts to code my own projects:

- Functions should be kept in a small behavior
- When a project is forked from origin, be sure to 'extend' it over rewriting whole base.
- Hidden structures are not preferable for long-term maintenance
- Use a language that you can do well

## Why personal tools matter even 'more' in the age of AI

First-class chefs grind one's own knife to cook better.
Also, first-class programmers write one's own program to code better.

However, contrary to well-ground knives, various kinds of personal software are usually considered as `unnecessarily complex chores`.
Many coding tools like VSCode, Vim, Emacs, Codex CLI...All of them are well-ground knives **from mass-production factories**.
This means when you grind them properly, you may get benefits while programming.

In my case, text editors matter when I write code.
I started developing my own editor with `torvalds/uemacs` base; and surprisingly, the result that I obtained was quite different from original MicroEmacs maintained by Linus Torvalds.
Every developers have their own patterns when reading, and writing what they aim for.

I am pretty sure developing your own software to benefit your workflows will help.

## AI opened a new era: DIY, personalized tools

When using AI copilots, you can even develop your own tools within few months.
Contrary to 2010s, many kinds of bugs are well-trained inside of AI weights. Consequently, needs of debugging whole codes like playing a one-man show, can be easily replaced by global AI models.
Although there are many side-effects while including legal conflicts, AI is good news for lonely amateurs who work for themselves.

In 2010s, making their own tools to enhance UX just for themselves was challenging; so if they pay a same amount of attention to their 'starred' project to fill their portfolio, they could code a whole website.
But in 2020s, people just can 'order' a tiny tools when they need. This is a huge change since the Industrial Revolution.

I am pretty sure this technology may change the way we develop more and more.

We can simply consume AI-generated products if we choose to.
But in this paradigm, we can also reproduce them, as long as we can imagine.

So, to cope with these changes, make your own stuff and enjoy, even if it never gets GitHub stars from others.
