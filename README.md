# Deep Web Heist 🕵️‍♂️💻

# 🖥️ [Clique aqui para acessar o jogo!](https://gustaaxz.github.io/deep_heist/)

Bem-vindo ao **Deep Web Heist**, um jogo de assalto assimétrico multiplayer! Neste jogo, um jogador assume o papel do **Hacker**, controlando e desativando sistemas de segurança através de um terminal, enquanto os outros jogadores atuam como **Agentes de Campo**, precisando se infiltrar em prédios corporativos e desviar de lasers, câmeras e guardas.

## 🎮 Como Jogar (Multijogador)

O jogo funciona com um sistema de Lobbies (Salas). O Hacker cria a sala e os Agentes se conectam a ela.

### Para o Hacker:
1. Acesse a página inicial do jogo.
2. Clique em **"Create Server"**.
3. O sistema vai gerar um **Código de 4 dígitos** (Server Code). Compartilhe esse código com seus amigos (Agentes de Campo).
4. Uma vez conectado, você terá acesso ao terminal **Heist OS**. Monitore os logs de segurança e use comandos no terminal para desativar as defesas do prédio antes que os agentes sejam pegos!
   - *Comandos disponíveis:* `help`, `ls`, `netscan`, `ping`, `sql` e `clear`.
   - *Dica:* Para desativar os lasers do cofre, use o comando: `sql UPDATE SECURITY SET STATUS='OFF'`

### Para o Agente de Campo:
1. Acesse a página do Agente (atualmente em `/agent.html` para testes).
2. Digite o **Código de 4 dígitos** que o Hacker te passou.
3. Clique em **"Connect"**.
4. Você precisa se comunicar por voz com o Hacker. Antes de passar por uma área com lasers, certifique-se de que o Hacker já desativou as defesas, ou o alarme será acionado!

## 🚀 Tecnologias Utilizadas

Este projeto foi construído utilizando tecnologias web modernas para garantir uma experiência imersiva e tempo real:

- **HTML5 & CSS3:** Interface imersiva de monitor CRT (scanlines, glitch effects) para o Hacker OS.
- **JavaScript (ES6+):** Lógica do terminal, efeito de digitação e gerenciamento de estado.
- **Firebase Realtime Database:** Sincronização de dados ultrarrápida entre o Hacker e os Agentes de Campo, criando salas e trocando logs instantaneamente.

## 🛠️ Como Contribuir ou Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/gustaaxz/deep_heist.git
   ```
2. Abra a pasta do projeto. Você pode usar a extensão "Live Server" do VSCode ou qualquer servidor local para rodar o projeto.
3. Abra o `index.html` para iniciar a interface do Hacker.
4. (Opcional) Abra o `agent.html` em outra aba ou dispositivo para simular um agente conectando.

## 🌐 Hospedagem

Este projeto foi projetado para rodar diretamente no navegador, sem necessidade de servidores backend complexos. Você pode jogar online acessando a página oficial hospedada via **GitHub Pages**!

---
*Deep Web Heist - Nenhuma corporação está segura.*
