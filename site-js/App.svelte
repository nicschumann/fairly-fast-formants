<script lang="ts">
    import { Router, Route } from 'svelte-routing';
    import File from './routes/File.svelte';
    import Home from './components/Home.svelte';
    import Header from './components/Header.svelte';
    import Microphone from './routes/Microphone.svelte';
    import TestCase from './routes/TestCase.svelte';

    export let url = "";

</script>

<Router url="{url}">
    <Header/>
    <Route path="/">
        <Home />
    </Route>
    <Route path="/mic">
        <Microphone />
    </Route>
    <Route path="file/:name" let:params>
        <File name="{params.name}"/>
    </Route>
    <Route path="testcase" let:params>
        <TestCase />
    </Route>       
</Router>


<style lang='css'>
    :root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        
        --component-margin: 15px;
    }

    :global(body) {
        margin:0;
        height:100%;
        background-color: #fbfbfb;
        box-sizing: border-box;
    }

    :global(.debug-red) {
        border: 1px solid red !important;
    }

    :global(.debug-blue) {
        border: 1px solid blue !important;
    }
</style>