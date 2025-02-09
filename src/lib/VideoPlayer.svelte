<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import videojs from 'video.js';

  export let options: any = {};
  let videoPlayer: HTMLVideoElement;
  let player: any | null = null;

  onMount(() => {
    player = videojs(videoPlayer, options, () => {
      console.log('onPlayerReady', player);
    });
  });

  onDestroy(() => {
    if (player) {
      player.dispose();
    }
  });
</script>

<div>
  <video bind:this={videoPlayer} class="video-js">
    <track kind="captions"/>
  </video>
</div>
