<nav class="navigation" role="navigation">
<ul class="card-list grid-view group">
    {{#each this}}
        <li><a href="#kort/{{key}}" class="category-{{category}}">
            <span>{{this.title}}</span>
        </a></li>
    {{/each}}

</ul>
</nav>