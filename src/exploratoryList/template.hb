{{#each this}}
    <div class="item">
        <a href="#kort/{{key}}" class="importance-{{importance}} colorid-{{colorid}}">
            <span>{{this.title}}</span>
        </a>
    </div>
{{/each}}