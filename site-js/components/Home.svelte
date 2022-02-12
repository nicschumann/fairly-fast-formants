<script lang='ts'>
    import { Link } from 'svelte-routing';
    import { test_data } from '../state/data';

    console.log(test_data);
    console.log(Object.keys(test_data));
</script>

<main>
   <p class="intro-text">
       Fairly Fast Formants is a javascript and web assembly library for formant extraction and tracking.
   </p> 
   <section class="audio-tests">
   {#each Object.keys(test_data) as key}
       <Link to="/file/{key}">
           <div class="test-file">
               <p>{test_data[key].name}</p>
           </div>
        </Link>
   {/each}
   </section>
</main>


<style>
   main {
       margin:var(--component-margin);
   }

   p.intro-text {
       max-width: 600px;
   }
</style>