<template>
  <div class="min-h-screen flex flex-col bg-bg-dark">
    <MatrixRain />
    <Navbar />
    <main class="flex-grow bg-noise relative z-10">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import MatrixRain from '@/components/MatrixRain.vue'
</script>
