bse-admin
=========

[![NPM](https://nodei.co/npm/bse-admin.png)](https://nodei.co/npm/bse-admin/)

[![Coveralls branch](https://img.shields.io/coveralls/bem-site/bse-admin/master.svg)](https://coveralls.io/r/bem-site/bse-admin?branch=master)
[![Travis](https://img.shields.io/travis/bem-site/bse-admin.svg)](https://travis-ci.org/bem-site/bse-admin)
[![David](https://img.shields.io/david/bem-site/bse-admin.svg)](https://david-dm.org/bem-site/bse-admin)
[![David](https://img.shields.io/david/dev/bem-site/bse-admin.svg)](https://david-dm.org/bem-site/bse-admin#info=devDependencies)

Сборщик данных для [bem-site-engine](https://github.com/bem/bem-site-engine)

В качестве хранилища данных используется база данных [LevelDB](http://en.wikipedia.org/wiki/LevelDB)

Соответствующий [nodejs модуль](https://github.com/rvagg/node-levelup) для работы с базой данных.

Структура работы основана на создании сценариев и последовательном выполнении всех этапов в данных сценариях.

Доступные сценарии описаны модулями которые находятся в директории [targets](./src/targets)

## API

//TODO написать документацию по API

## Сценарии

Сценарий представляет собой класс который должен быть унаследован от класса [TargetBase](./src/targets/base.js)

```
var TargetBase = require('./base').TargetBase,
    TargetFoo = function (options) {
        this.init(options);
    };

TargetFoo.prototype = Object.create(TargetBase.prototype);
TargetFoo.prototype.init = function (options) {
    [
        // Set list of tasks here
    ].forEach(function (task) {
        this.addTask(task);
    }, this);

    TargetBase.prototype.init.call(this, options);
};

TargetFoo.prototype.getName = function () {
    return 'Your target name';
};

exports.TargetFoo = TargetFoo;
```

При создании сценария должны быть переопределен метод `init` в котором нужно указать массив тех
шагов которые должны быть выполнены для данного сценария в той последовательности в какой они написаны.

Также должен быть переопределен метод `getName` который должен возвращать название сценария.
Это необходимо для построения логов.

### Готовые сценарии

* [Очистка базы данных](./docs/clear-db.md)
* [Публикация модели](./docs/update-model.md)
* [Полная сборка модели](./docs/nodes.md)
* [Сборка модели в режиме разработки](./docs/nodes-dev.md)
* [Обновление документации в режиме разработки](./docs/docs-dev.md)
* [Обновление библиотек в режиме разработки](./docs/libraries-dev.md)

### Тестирование

Для запуска тестов с дополнительной проверкой синтакса:
```
npm test
```

Для запуска только mocha тестов:
```
npm run mocha
```

Для запуска тестов с покрытием:
```
npm run istanbul
```

Ответственный за разработку: @tormozz48
