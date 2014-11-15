<nav class="navigation" role="navigation">
<ul class="card-list grid-view">
    {{#each this}}
        <li><a href="#kort/{{key}}" class="bulb colorid-{{colorid}}">
            <span>{{this.title}}</span>
        </a></li>
    {{/each}}

</ul>
</nav>