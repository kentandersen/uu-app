<div class="container logo">

    <img src="images/uu-logo.png" alt="logo"/>


</div>

{{#if showBackButton}}
    <a href="#" class="closebtn">
        <span class="visuallyhidden">Tilbake til forside</span>
    </a>

{{else}}

    <div class="toggle-nav-mode">

        <a href="#exploratory" class="nav-mode icon-bubble{{#if isExploratory}} checked{{/if}}">
            <span class="visuallyhidden">Utforskende navigeringsmodus</span>
        </a>

        <a href="#liste" class="nav-mode icon-grid{{#if isListe}} checked{{/if}}">
            <span class="visuallyhidden">Meny i alfabetisk sortert rekkefølge</span>
        </a>

    </div>



{{/if}}