<header>
  <div class="container">
    <h1 class="decorated">{{title}}</h1>
    <p class="lead">{{preface}}</p>
  </div>
</header>

{{#if figure}}
<figure class="colorid-{{colorid}}" {{#if figureBackgroundColor}}style="background-color:{{figureBackgroundColor}}"{{/if}}>
  <div class="container">
    <img src="{{figure}}" alt="Katt"/>
  </div>
</figure>
{{/if}}


<div class="article-body">
  <div class="container">
    {{{body}}}
  </div>
</div>

<aside>
  <div class="container">
  {{#if reference}}
  <section>
    <h2>Referanser og ressurser</h2>
    <ul>
      {{#each reference}}
        <li>
          <a href="{{url}}">
            {{title}}
          </a>
        </li>
      {{/each}}
    </ul>
  </section>
  {{/if}}


  {{#if relevant}}
  <section>
    <h2>
      Relevante og beslektede temaer
    </h2>

    <ul>
    {{#each relevant}}
      <li>
        <a href="{{url}}">
          {{title}}
        </a>
      </li>
    {{/each}}
    </ul>

  </section>
  {{/if}}
  </div>
</aside>
