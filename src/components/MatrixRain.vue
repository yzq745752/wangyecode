<template>
  <canvas ref="canvasRef" class="matrix-rain" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const RAIN_COLOR = '#33ff77'
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationId: number | null = null

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const codechars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?/~`'
  const messageList = [
  '许我三尺剑',
  '斩向九天又何惧？',
  '豪气冲九重',
  '心无畏，自无敌',
  '三尺剑，胆气生，一往无前',
  '纵使路遥多荆棘',
  '仗剑且徐行'
  ]
  //const allMessages = messageList.join('')
  //const chars = codechars + allMessages
  const chars = codechars
  const fontSize = 14
  const columns = Math.floor(canvas.width / fontSize)
  const maxRows = Math.floor(canvas.height / fontSize)
  const drops: number[] = new Array(columns).fill(0).map(() => Math.floor(Math.random() * maxRows))
  const columnStates = new Array(columns).fill(null)

  // Pre-fill the canvas with characters so it looks complete on first frame
  ctx.fillStyle = 'rgba(8, 8, 16, 1)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = RAIN_COLOR
  ctx.font = `${fontSize}px monospace`
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < drops[i]; j++) {
      const text = chars[Math.floor(Math.random() * chars.length)]
      ctx.globalAlpha = 0.3 + Math.random() * 0.5
      ctx.fillText(text, i * fontSize, j * fontSize)
    }
    ctx.globalAlpha = 1
  }

  const draw = () => {
    // 每隔一段时间，随机选一列显示句子
    // 0.005 的意思是：每一帧有 0.5% 的概率触发
    if (Math.random() < 0.6) {
      // 随机选一列
      const randomCol = Math.floor(Math.random() * columns)
      // 只有当这一列没有在显示句子时，才触发
      if (!columnStates[randomCol]) {
        // 随机选一段话
        const randomMsgIndex = Math.floor(Math.random() * messageList.length)
        columnStates[randomCol] = { 
          currentMessageIndex: randomMsgIndex, 
          messageIndex: 0
        }  
      }
    }
    ctx.fillStyle = 'rgba(8, 8, 16, 0.05)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = RAIN_COLOR
    ctx.font = `${fontSize}px monospace`

    for (let i = 0; i < drops.length; i++) {
      let text
      if (columnStates[i]) {
        // 这一列正在显示句子
        const currentMsg = messageList[columnStates[i].currentMessageIndex]
        text = currentMsg[columnStates[i].messageIndex]
        // 移动到下一个字，如果到了末尾就回到随机模式
        columnStates[i].messageIndex++
        if (columnStates[i].messageIndex >= currentMsg.length) {
          columnStates[i] = null
        }
      } else {
        // 这一列显示随机字符
        text = chars[Math.floor(Math.random() * chars.length)]
      }
      const x = i * fontSize
      const y = drops[i] * fontSize

      // Brighter head character
      if (Math.random() > 0.5) {
        ctx.fillStyle = RAIN_COLOR
      } else {
        const alpha = 0.5 + Math.random() * 0.5
        ctx.fillStyle = `rgba(51, 255, 119, ${alpha})`
      }

      ctx.fillText(text, x, y)

      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0
      }
      drops[i]++
    }
  }

  const animate = () => {
    draw()
    animationId = requestAnimationFrame(() => setTimeout(animate, 50))
  }

  animate()

  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  })
})
</script>

<style scoped>
.matrix-rain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: var(--matrix-rain-opacity, 0.15);
  transition: opacity 0.5s ease;
}
</style>
