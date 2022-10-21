<template>
  <a
    ref="jumpLink"
    class="jump-link"
    href="#"
    target="_blank"
    draggable="false"
    @mousedown="onMouseDown"
    @click="toLink"
    @auxclick="onAuxClick"
  >
    <slot />
  </a>
</template>

<script lang="ts" src="./jump-link.ts" />

<style scoped lang="scss" src="./jump-link.scss" />
