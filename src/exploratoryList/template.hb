<nav class="navigation" role="navigation">
<ul class="group">
    {{#each this}}
        <li><a href="#kort/{{key}}" class="importance-{{importance}} colorid-{{colorid}}">
            <span>{{this.title}}</span>
        </a></li>
    {{/each}}

</ul>
</nav>