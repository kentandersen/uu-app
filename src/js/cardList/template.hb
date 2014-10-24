<nav class="navigation" role="navigation">
<ul class="card-list grid-view group">
    {{#each this}}
        <li><a href="#kort/{{key}}"><span>{{this.title}}</span></a></li>
    {{/each}}

</ul>
</nav>