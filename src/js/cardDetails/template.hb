<header>
    <h1 class="decorated">{{title}}</h1>
    <p class="lead">{{preface}}</p>
</header>

{{#if figure}}
<figure>
  <img src="{{figure}}" alt="Katt"/>
</figure>
{{/if}}


<div class="article-body">
  {{{body}}}
</div>
<aside>

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

</aside>
