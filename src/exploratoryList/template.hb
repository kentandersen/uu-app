<div class="project-face">Innsikt</div>

<div class="project-face">Konsept</div>

<div class="project-face">Utvikling</div>

<div class="project-face">Test</div>



{{#each this}}
    <div class="item">
        <a href="#kort/{{key}}" data-cid="{{cid}}" class="bulb importance-{{importance}} colorid-{{colorid}}">
            <span>{{this.title}}</span>
        </a>
    </div>
{{/each}}