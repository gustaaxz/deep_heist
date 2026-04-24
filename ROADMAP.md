# 🗺️ Deep Web Heist - Roadmap (20 Implementações)

Aqui está a lista de 20 novas mecânicas e funcionalidades planejadas para evoluir o jogo, focadas na interação entre o Hacker e os Agentes de Campo (sem uso de arquivos de áudio locais, focando em sistemas).

## 💻 Sistema do Hacker (Terminal OS)
1. **Comando `brute_force [ip]`**: Um mini-game no terminal (estilo Mastermind ou Wordle numérico) que o Hacker precisa resolver em tempo real para destravar portas blindadas.
2. **Sistema de Trace (Rastreamento)**: Uma barra de perigo que enche quando o Hacker comete erros de digitação ou usa comandos pesados. Se chegar a 100%, o Hacker perde a conexão temporariamente.
3. **Comando `camera_view [id]`**: Um visualizador em arte ASCII simulando o feed de uma câmera. Permite ao Hacker descrever o que há na sala para o Agente ("Tem dois guardas aí!").
4. **Comando `decrypt [arquivo]`**: Um comando que leva um tempo real (ex: 30 segundos) processando na tela. O Hacker fica com o terminal bloqueado e o Agente precisa sobreviver sem ajuda até terminar.
5. **Comando `map`**: Um blueprint em ASCII do andar atual gerado proceduralmente. Mostra onde estão servidores, cofres e portas trancadas.
6. **E-mails e Lore (`cat /emails/admin.txt`)**: Textos escondidos no sistema de arquivos que contêm senhas ou rotas de patrulha. O Hacker precisa ler e deduzir informações.
7. **Comando `overload_node`**: Apaga a luz de um setor inteiro no jogo do Agente. Câmeras desligam, mas guardas entram em estado de alerta.
8. **Upgrades Virtuais (RAM/CPU)**: Conforme roubam dados, o Hacker "compra" upgrades no meio da partida para conseguir rodar o comando `decrypt` em background (segundo plano).
9. **Interceptação de Rádio (`intercept`)**: Um feed de texto onde o Hacker consegue ler as comunicações dos guardas do prédio ("Investigando barulho no Setor B").

## 🏃‍♂️ Sistema do Agente de Campo
10. **Medidor de Suspeita Visual**: Se o Agente agir de forma agressiva (simulado na interface dele), uma barra vermelha sobe. Se encher, os lasers ativam independentemente do Hacker.
11. **Teclado Numérico (Keypad)**: O Agente encontra portas com senha. A tela do Agente mostra um teclado numérico, e ele precisa digitar a senha exata que o Hacker encontrou no terminal.
12. **Mecânica de "Cut Wire" (Cortar Fio)**: Para desativar alarmes manuais, a tela do Agente mostra 4 fios coloridos. O Hacker tem que ler o manual via terminal (`cat /manuals/bomb.txt`) e gritar qual fio o Agente deve cortar.
13. **Gás Tóxico (Timer de Vida)**: Se um alarme global tocar, a tela do Agente começa a ficar verde e um timer de oxigênio de 60 segundos começa. O Hacker precisa usar `sql` na ventilação para salvar o Agente.
14. **Coleta de Pen Drives**: O Agente tem um botão de "Vasculhar Sala". Se achar um pen drive, ele clica em "Plugar". Isso libera novos comandos mágicos no terminal do Hacker.

## ⚙️ Lobby e Metajogo
15. **Sistema de Loadout (Equipamentos)**: No lobby, o Agente pode escolher um benefício: "Sapatos Silenciosos" (barra de suspeita sobe mais devagar) ou "Bateria Extra" (mais tempo nos mini-games).
16. **Níveis de Dificuldade da Sala**: O Hacker escolhe o alvo: Startup (Fácil), Banco Central (Médio), ou Sede Illuminati (Difícil). A dificuldade aumenta os alarmes e diminui os tempos.
17. **Sistema de Extração (Timer Global)**: Um relógio digital gigante no topo da tela de ambos. "A Polícia chega em 15:00". Eles precisam roubar o alvo e fugir antes de zerar.
18. **Chat de Texto de Emergência**: Um console de chat direto entre Agente e Hacker na tela, útil caso a comunicação por voz dos jogadores falhe ou para mandar senhas complexas.
19. **Ranking de Partidas (Leaderboard)**: O Firebase salva o tempo de conclusão de cada assalto e exibe os melhores Hackers/Agentes na tela inicial do jogo.
20. **Eventos Aleatórios Globais**: Durante a partida, o Firebase pode sortear um evento (Ex: "Falta de energia na cidade!"). As telas piscam e as câmeras desligam por 1 minuto, criando oportunidades ou caos.
