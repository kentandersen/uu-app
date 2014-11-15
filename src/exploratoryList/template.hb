{{#each this}}
    <div class="item">
        <a href="#kort/{{key}}" class="bulb importance-{{importance}} colorid-{{colorid}}">
            <span>{{this.title}}</span>
        </a>
    </div>
{{/each}}