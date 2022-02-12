<script lang="ts">
    import { Router, Route } from 'svelte-routing';
    import File from './routes/File.svelte';
    import Home from './components/Home.svelte';
    import Header from './components/Header.svelte';

    export let url = "";

</script>

<Router url="{url}">
    <Header/>
    <Route path="/">
        <Home />
    </Route>
    <Route path="file/:name" let:params>
        <File name="{params.name}"/>
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
</style>